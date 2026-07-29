import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.websocket.manager import manager
from app.models.database import get_db, Session as DBSession
from app.core.auth_deps import get_ws_user
from app.core.rate_limit import check_ws_turn_limit
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
    # The session_id comes from the client and is NOT trustworthy on its own.
    # Scope it to the authenticated user (derived from the one-time ticket) so
    # a user can never read, hijack, or collide with another user's live
    # conversation state — all connection/history keys are prefixed by user id.
    scoped_session_id = f"{current_user.id}:{session_id}"
    db_session_id = None

    try:
        await manager.connect(websocket, scoped_session_id)

        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")

            if message_type == "audio_chunk":
                # Per-user cap on paid STT+LLM+TTS turns — checked before any
                # provider call so rejected turns incur no cost.
                if not check_ws_turn_limit(current_user.id):
                    await manager.send_message(scoped_session_id, {
                        "type": "rate_limited",
                        "message": "Trop de messages en peu de temps. Patiente un instant avant de continuer.",
                    })
                    continue
                await manager.handle_audio_chunk(
                    scoped_session_id,
                    data.get("audio_data"),
                    data.get("mime_type", "audio/webm"),
                    data.get("target_lang"),
                )

            elif message_type == "start_session":
                db_session = DBSession(user_id=current_user.id)
                db.add(db_session)
                db.commit()
                db.refresh(db_session)
                db_session_id = db_session.id
                await manager.send_message(scoped_session_id, {
                    "type": "session_started",
                    "db_session_id": db_session_id,
                })

            elif message_type == "end_session":
                if db_session_id:
                    await manager.end_session(scoped_session_id, db_session_id)
                break

            elif message_type == "ping":
                await manager.send_message(scoped_session_id, {"type": "pong"})

    except WebSocketDisconnect:
        if db_session_id:
            await manager.end_session(scoped_session_id, db_session_id)

    except Exception as e:
        logger.error("WebSocket error for session %s: %s", scoped_session_id, e)
        await manager.send_message(scoped_session_id, {"type": "error", "message": "Internal server error"})

    finally:
        manager.disconnect(scoped_session_id)
