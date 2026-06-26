import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.websocket.manager import manager
from app.models.database import get_db, Session as DBSession
from app.core.auth_deps import get_ws_user
from app.models.database import User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_ws_user),
):
    """
    WebSocket endpoint for real-time audio streaming.
    Requires ?ticket=<one-time-ticket> query parameter (obtained from POST /api/ws-ticket).

    Flow: connect → start_session → audio_chunk* → end_session → disconnect
    """
    db_session_id = None

    try:
        await manager.connect(websocket, session_id)

        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")

            if message_type == "audio_chunk":
                await manager.handle_audio_chunk(session_id, data.get("audio_data"))

            elif message_type == "start_session":
                db_session = DBSession(user_id=current_user.id)
                db.add(db_session)
                db.commit()
                db.refresh(db_session)
                db_session_id = db_session.id
                await manager.send_message(session_id, {
                    "type": "session_started",
                    "db_session_id": db_session_id,
                })

            elif message_type == "end_session":
                if db_session_id:
                    await manager.end_session(session_id, db_session_id)
                break

            elif message_type == "ping":
                await manager.send_message(session_id, {"type": "pong"})

    except WebSocketDisconnect:
        if db_session_id:
            await manager.end_session(session_id, db_session_id)

    except Exception as e:
        logger.error("WebSocket error for session %s: %s", session_id, e)
        await manager.send_message(session_id, {"type": "error", "message": "Internal server error"})

    finally:
        manager.disconnect(session_id)
