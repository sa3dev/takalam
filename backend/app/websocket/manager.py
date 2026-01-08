import json
import base64
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
from app.services.speech_manager import SpeechManager
from app.models.database import SessionLocal, Session, Transcription


class ConnectionManager:
    """Manages WebSocket connections for real-time audio streaming."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_data: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept WebSocket connection and initialize session."""
        await websocket.accept()
        self.active_connections[session_id] = websocket

        # Initialize session data
        self.session_data[session_id] = {
            "conversation_history": [],
            "transcriptions": [],
            "started_at": datetime.utcnow(),
            "speech_manager": SpeechManager()
        }

        await self.send_message(session_id, {
            "type": "connected",
            "message": "WebSocket connection established",
            "session_id": session_id
        })

    def disconnect(self, session_id: str):
        """Remove WebSocket connection."""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.session_data:
            del self.session_data[session_id]

    async def send_message(self, session_id: str, message: dict):
        """Send JSON message to client."""
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            await websocket.send_json(message)

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients."""
        for session_id in self.active_connections:
            await self.send_message(session_id, message)

    async def handle_audio_chunk(self, session_id: str, audio_data: str):
        """
        Handle incoming audio chunk from client.

        Args:
            session_id: Unique session identifier
            audio_data: Base64 encoded audio data
        """
        if session_id not in self.session_data:
            await self.send_message(session_id, {
                "type": "error",
                "message": "Session not found"
            })
            return

        try:
            # Decode audio
            audio_bytes = base64.b64decode(audio_data)

            # Get session data
            session = self.session_data[session_id]
            speech_manager = session["speech_manager"]
            conversation_history = session["conversation_history"]

            # Send processing status
            await self.send_message(session_id, {
                "type": "processing",
                "message": "Processing your audio..."
            })

            # Process audio through SpeechManager
            user_text, ai_response, ai_audio = await speech_manager.process_conversation_turn(
                audio_data=audio_bytes,
                conversation_history=conversation_history,
                language="ar"
            )

            # Store transcriptions
            session["transcriptions"].extend([
                {"speaker": "user", "text": user_text},
                {"speaker": "assistant", "text": ai_response}
            ])

            # Send user transcription
            await self.send_message(session_id, {
                "type": "transcription",
                "speaker": "user",
                "text": user_text,
                "is_final": True
            })

            # Send AI response text
            await self.send_message(session_id, {
                "type": "transcription",
                "speaker": "assistant",
                "text": ai_response,
                "is_final": True
            })

            # Send AI audio response
            ai_audio_base64 = base64.b64encode(ai_audio).decode('utf-8')
            await self.send_message(session_id, {
                "type": "audio_response",
                "audio_data": ai_audio_base64,
                "format": "mp3"
            })

        except Exception as e:
            print(f"Error processing audio: {e}")
            await self.send_message(session_id, {
                "type": "error",
                "message": f"Error processing audio: {str(e)}"
            })

    async def end_session(self, session_id: str, db_session_id: int):
        """
        End session and save transcriptions to database.

        Args:
            session_id: WebSocket session ID
            db_session_id: Database session ID
        """
        if session_id not in self.session_data:
            return

        session = self.session_data[session_id]
        transcriptions = session["transcriptions"]
        started_at = session["started_at"]

        # Calculate duration
        ended_at = datetime.utcnow()
        duration = int((ended_at - started_at).total_seconds())

        # Save to database
        db = SessionLocal()
        try:
            # Update session
            db_session = db.query(Session).filter(Session.id == db_session_id).first()
            if db_session:
                db_session.ended_at = ended_at
                db_session.duration_seconds = duration

            # Save transcriptions
            for t in transcriptions:
                transcription = Transcription(
                    session_id=db_session_id,
                    speaker=t["speaker"],
                    text=t["text"],
                    language="ar"
                )
                db.add(transcription)

            db.commit()

            # Send completion message
            await self.send_message(session_id, {
                "type": "session_ended",
                "duration_seconds": duration,
                "message": "Session saved successfully"
            })

        except Exception as e:
            print(f"Error saving session: {e}")
            db.rollback()

        finally:
            db.close()


# Global connection manager instance
manager = ConnectionManager()
