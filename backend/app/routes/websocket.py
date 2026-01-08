import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.websocket.manager import manager
from app.models.database import get_db, Session as DBSession
from app.schemas.session import SessionCreate

router = APIRouter()


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time audio streaming.

    Flow:
    1. Client connects
    2. Client sends audio chunks (base64 encoded)
    3. Server processes: STT -> LLM -> TTS
    4. Server sends back transcriptions and audio response
    5. Client disconnects, session is saved
    """
    db_session_id = None

    try:
        # Accept connection
        await manager.connect(websocket, session_id)

        # Main message loop
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type")

            if message_type == "audio_chunk":
                # Handle audio chunk
                audio_data = data.get("audio_data")
                await manager.handle_audio_chunk(session_id, audio_data)

            elif message_type == "start_session":
                # Create session in database
                user_id = data.get("user_id", 1)  # TODO: Get from auth
                db_session = DBSession(user_id=user_id)
                db.add(db_session)
                db.commit()
                db.refresh(db_session)

                db_session_id = db_session.id

                await manager.send_message(session_id, {
                    "type": "session_started",
                    "db_session_id": db_session_id
                })

            elif message_type == "end_session":
                # End session and save data
                if db_session_id:
                    await manager.end_session(session_id, db_session_id)
                break

            elif message_type == "ping":
                # Heartbeat
                await manager.send_message(session_id, {"type": "pong"})

    except WebSocketDisconnect:
        # Client disconnected
        if db_session_id:
            await manager.end_session(session_id, db_session_id)

    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.send_message(session_id, {
            "type": "error",
            "message": str(e)
        })

    finally:
        manager.disconnect(session_id)
