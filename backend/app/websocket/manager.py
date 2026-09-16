import json
import logging
import base64
from typing import Dict
from fastapi import WebSocket
from fastapi.concurrency import run_in_threadpool
from datetime import datetime
from app.services.speech_manager import speech_manager, TurnFailedAfterTranscription
from app.models.database import SessionLocal, Session, Transcription
from app.core.redis_client import client as _redis

logger = logging.getLogger(__name__)

# ~1 MB decoded — roughly 3 to 6 minutes of Opus depending on bitrate, which is
# already far more than a conversational turn. The previous 14 MB allowed close
# to an hour of audio in a single chunk, and since the daily quota is checked
# before the turn and billed after it, one such chunk let an exhausted free
# account buy itself an hour of Whisper. The ceiling is what makes the "overshoot
# by one utterance" rule mean an utterance.
_MAX_AUDIO_B64_LEN = 1_400_000
# Keep last 20 user+assistant pairs to cap LLM token cost
_MAX_HISTORY_MESSAGES = 40
# Conversation history TTL in Redis: 1h of inactivity, refreshed on reconnect
_HISTORY_TTL = 3600


class ConnectionManager:
    """Manages WebSocket connections for real-time audio streaming."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        # Only local session metadata (transcriptions + timer).
        # Conversation history lives in Redis for persistence across restarts.
        self.session_data: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, session_id: str, user_id: int):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.session_data[session_id] = {
            "transcriptions": [],
            "started_at": datetime.utcnow(),
            "is_processing": False,
            # Needed to bill spoken seconds against the right daily counter;
            # session_id is prefixed with it but must not be parsed back out.
            "user_id": user_id,
        }
        # Refresh TTL on reconnect so in-progress history is preserved
        _redis.expire(f"conv_history:{session_id}", _HISTORY_TTL)
        _redis.expire(f"conv_session:{session_id}", _HISTORY_TTL)
        await self.send_message(session_id, {
            "type": "connected",
            "message": "WebSocket connection established",
            "session_id": session_id,
        })

    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)
        self.session_data.pop(session_id, None)
        # History stays in Redis until TTL expires — allows clean reconnect

    async def send_message(self, session_id: str, message: dict):
        ws = self.active_connections.get(session_id)
        if ws:
            await ws.send_json(message)

    def _get_history(self, session_id: str) -> list:
        raw = _redis.get(f"conv_history:{session_id}")
        return json.loads(raw) if raw else []

    def _save_history(self, session_id: str, history: list) -> None:
        _redis.setex(f"conv_history:{session_id}", _HISTORY_TTL, json.dumps(history))

    def recall_db_session(self, session_id: str) -> int | None:
        """The database row this conversation is already being written to, if it
        has one. Outlives the connection, exactly like the history it belongs
        to, so a reconnect continues a session instead of opening a second."""
        raw = _redis.get(f"conv_session:{session_id}")
        return int(raw) if raw else None

    def remember_db_session(self, session_id: str, db_session_id: int) -> None:
        _redis.setex(f"conv_session:{session_id}", _HISTORY_TTL, db_session_id)

    async def handle_audio_chunk(
        self, session_id: str, audio_data: str, mime_type: str = "audio/webm", target_lang: str = None
    ) -> float | None:
        """Run one conversation turn. Returns the seconds actually spoken, or
        None if no transcription happened — the caller holds a quota reservation
        and needs to know whether to keep it or hand it back.

        "No transcription happened" is meant strictly: a turn that reached
        Whisper and then broke returns its duration, not None. The provider
        charged us for those seconds either way, and a refund is a refusal to
        meter speech that really was spoken — which a client can trigger at will
        by closing its socket mid-turn."""
        session = self.session_data.get(session_id)
        if not session:
            await self.send_message(session_id, {"type": "error", "message": "Session not found"})
            return None

        if not audio_data or len(audio_data) > _MAX_AUDIO_B64_LEN:
            await self.send_message(session_id, {"type": "error", "message": "Audio chunk too large"})
            return None

        if session["is_processing"]:
            await self.send_message(session_id, {"type": "busy", "message": "Still processing previous audio"})
            return None

        session["is_processing"] = True
        # Filled in the moment Whisper reports a duration, and returned by every
        # exit below — including the failure paths, which is the whole point:
        # sending audio and hanging up before the reply must not be cheaper than
        # staying to listen to it.
        spoken_seconds: float | None = None
        try:
            audio_bytes = base64.b64decode(audio_data)

            conversation_history = self._get_history(session_id)

            await self.send_message(session_id, {"type": "processing", "message": "Processing your audio..."})

            # Each line is shown and recorded the moment it exists, rather than
            # at the end of the turn. What the speaker saw and what the session
            # keeps are then the same thing, even when a later stage fails.
            async def announce_speech(text: str) -> None:
                session["transcriptions"].append({"speaker": "user", "text": text})
                await self.send_message(session_id, {
                    "type": "transcription",
                    "speaker": "user",
                    "text": text,
                    "is_final": True,
                })

            async def announce_answer(text: str, translation: str) -> None:
                session["transcriptions"].append({"speaker": "assistant", "text": text})
                await self.send_message(session_id, {
                    "type": "transcription",
                    "speaker": "assistant",
                    "text": text,
                    "translation": translation,
                    "is_final": True,
                })

            try:
                user_text, ai_response, translation, ai_audio, spoken_seconds = await speech_manager.process_conversation_turn(
                    audio_data=audio_bytes,
                    conversation_history=conversation_history,
                    language="ar",
                    mime_type=mime_type,
                    target_lang=target_lang,
                    on_transcribed=announce_speech,
                    on_answer=announce_answer,
                )
            except TurnFailedAfterTranscription as e:
                spoken_seconds = e.spoken_seconds
                raise

            # Trim then persist to Redis
            if len(conversation_history) > _MAX_HISTORY_MESSAGES:
                conversation_history[:] = conversation_history[-_MAX_HISTORY_MESSAGES:]
            self._save_history(session_id, conversation_history)

            await self.send_message(session_id, {
                "type": "audio_response",
                "audio_data": base64.b64encode(ai_audio).decode("utf-8"),
                "format": "mp3",
            })
            return spoken_seconds

        except Exception as e:
            logger.error(
                "Error processing audio for session %s: %s (spoken: %s)",
                session_id, e, "unknown" if spoken_seconds is None else f"{spoken_seconds:.1f}s",
            )
            try:
                await self.send_message(session_id, {"type": "error", "message": "Error processing audio"})
            except Exception:
                # Socket already gone — that is often the very reason we are
                # here. Reporting the failure is best-effort; returning the
                # duration is not, so it must not be lost to a second error.
                pass
            return spoken_seconds
        finally:
            if session_id in self.session_data:
                self.session_data[session_id]["is_processing"] = False

    async def save_progress(self, session_id: str, db_session_id: int) -> int:
        """Write what this connection produced to Postgres, without closing the
        session.

        Called when the socket simply goes away — a reload, a tunnel, a closed
        lid. None of those mean the conversation is over, but all of them mean
        its only copy is in this process's memory. Treating a dropped socket as
        a deliberate ending is what used to erase a conversation the user had
        every intention of continuing.

        Returns the session's accumulated duration, so the caller can announce
        the whole thing rather than the last leg of it."""
        session = self.session_data.get(session_id)
        if not session:
            return 0

        ended_at = datetime.utcnow()
        duration = int((ended_at - session["started_at"]).total_seconds())
        transcriptions = session["transcriptions"]

        total = await run_in_threadpool(
            self._persist_session,
            db_session_id,
            ended_at,
            duration,
            transcriptions,
        )

        # Written down is no longer owed. A second call for the same connection
        # — explicit end right after a drop — must not bill these seconds or
        # insert these lines twice.
        session["transcriptions"] = []
        session["started_at"] = ended_at
        return total

    async def end_session(self, session_id: str, db_session_id: int):
        """The deliberate ending, and the only thing that discards the
        conversation. Everything else is an interruption."""
        total = await self.save_progress(session_id, db_session_id)

        # Conversation is over — clean up Redis
        _redis.delete(f"conv_history:{session_id}")
        _redis.delete(f"conv_session:{session_id}")

        await self.send_message(session_id, {
            "type": "session_ended",
            "duration_seconds": total,
            "message": "Session saved successfully",
        })

    def _persist_session(self, db_session_id: int, ended_at, duration: int, transcriptions: list) -> int:
        db = SessionLocal()
        try:
            db_session = db.query(Session).filter(Session.id == db_session_id).first()
            if db_session:
                db_session.ended_at = ended_at
                # Accumulated, not replaced: a session can now span several
                # connections, and assigning here would report only the last one.
                db_session.duration_seconds = (db_session.duration_seconds or 0) + duration

            for t in transcriptions:
                db.add(Transcription(
                    session_id=db_session_id,
                    speaker=t["speaker"],
                    text=t["text"],
                    language="ar",
                ))

            db.commit()
            return db_session.duration_seconds if db_session else 0
        except Exception as e:
            logger.error("Error persisting session %s: %s", db_session_id, e)
            db.rollback()
            return 0
        finally:
            db.close()


manager = ConnectionManager()
