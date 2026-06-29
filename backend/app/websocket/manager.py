import json
import logging
import base64
from typing import Dict
from fastapi import WebSocket
from fastapi.concurrency import run_in_threadpool
from datetime import datetime
from app.services.speech_manager import speech_manager
from app.models.database import SessionLocal, Session, Transcription
from app.core.redis_client import client as _redis

logger = logging.getLogger(__name__)

# ~10 MB decoded → ~13.3 MB base64
_MAX_AUDIO_B64_LEN = 14_000_000
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

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.session_data[session_id] = {
            "transcriptions": [],
            "started_at": datetime.utcnow(),
        }
        # Refresh TTL on reconnect so in-progress history is preserved
        _redis.expire(f"conv_history:{session_id}", _HISTORY_TTL)
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

    async def handle_audio_chunk(self, session_id: str, audio_data: str):
        if session_id not in self.session_data:
            await self.send_message(session_id, {"type": "error", "message": "Session not found"})
            return

        if not audio_data or len(audio_data) > _MAX_AUDIO_B64_LEN:
            await self.send_message(session_id, {"type": "error", "message": "Audio chunk too large"})
            return

        try:
            audio_bytes = base64.b64decode(audio_data)
            session = self.session_data[session_id]

            conversation_history = self._get_history(session_id)

            await self.send_message(session_id, {"type": "processing", "message": "Processing your audio..."})

            user_text, ai_response, ai_audio = await speech_manager.process_conversation_turn(
                audio_data=audio_bytes,
                conversation_history=conversation_history,
                language="ar",
            )

            session["transcriptions"].extend([
                {"speaker": "user", "text": user_text},
                {"speaker": "assistant", "text": ai_response},
            ])

            # Trim then persist to Redis
            if len(conversation_history) > _MAX_HISTORY_MESSAGES:
                conversation_history[:] = conversation_history[-_MAX_HISTORY_MESSAGES:]
            self._save_history(session_id, conversation_history)

            await self.send_message(session_id, {
                "type": "transcription",
                "speaker": "user",
                "text": user_text,
                "is_final": True,
            })
            await self.send_message(session_id, {
                "type": "transcription",
                "speaker": "assistant",
                "text": ai_response,
                "is_final": True,
            })
            await self.send_message(session_id, {
                "type": "audio_response",
                "audio_data": base64.b64encode(ai_audio).decode("utf-8"),
                "format": "mp3",
            })

        except Exception as e:
            logger.error("Error processing audio for session %s: %s", session_id, e)
            await self.send_message(session_id, {"type": "error", "message": "Error processing audio"})

    async def end_session(self, session_id: str, db_session_id: int):
        if session_id not in self.session_data:
            return

        session = self.session_data[session_id]
        ended_at = datetime.utcnow()
        duration = int((ended_at - session["started_at"]).total_seconds())
        transcriptions = session["transcriptions"]

        await run_in_threadpool(
            self._persist_session,
            db_session_id,
            ended_at,
            duration,
            transcriptions,
        )

        # Conversation is over — clean up Redis
        _redis.delete(f"conv_history:{session_id}")

        await self.send_message(session_id, {
            "type": "session_ended",
            "duration_seconds": duration,
            "message": "Session saved successfully",
        })

    def _persist_session(self, db_session_id: int, ended_at, duration: int, transcriptions: list):
        db = SessionLocal()
        try:
            db_session = db.query(Session).filter(Session.id == db_session_id).first()
            if db_session:
                db_session.ended_at = ended_at
                db_session.duration_seconds = duration

            for t in transcriptions:
                db.add(Transcription(
                    session_id=db_session_id,
                    speaker=t["speaker"],
                    text=t["text"],
                    language="ar",
                ))

            db.commit()
        except Exception as e:
            logger.error("Error persisting session %s: %s", db_session_id, e)
            db.rollback()
        finally:
            db.close()


manager = ConnectionManager()
