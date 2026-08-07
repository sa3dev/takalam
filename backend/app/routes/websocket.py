import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.websocket.manager import manager
from app.models.database import get_db, Session as DBSession
from app.core.auth_deps import get_ws_user
from app.core.rate_limit import (
    check_ws_turn_limit,
    estimate_spoken_seconds,
    quota_resets_at,
    reserve_spoken_seconds,
    settle_spoken_seconds,
)
from app.config.settings import settings
from app.models.database import User
from app.services.paywall import record_wall_hit

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
        await manager.connect(websocket, scoped_session_id, current_user.id)

        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")

            if message_type == "audio_chunk":
                # Per-user cap on paid STT+LLM+TTS turns — checked before any
                # provider call so rejected turns incur no cost. Applies to
                # every plan: this is an abuse ceiling, not a product limit.
                if not check_ws_turn_limit(current_user.id):
                    await manager.send_message(scoped_session_id, {
                        "type": "rate_limited",
                        "message": "Trop de messages en peu de temps. Patiente un instant avant de continuer.",
                    })
                    continue

                # Freemium daily allowance — the limit Pro lifts. Distinct from
                # the cap above so the user sees a sales screen only when they
                # genuinely ran out of minutes, not when they simply talk fast.
                # The estimate is claimed atomically here and replaced by the real
                # duration after transcription, so two tabs can't both find room
                # in the same remaining second.
                audio_data = data.get("audio_data") or ""
                reserved = estimate_spoken_seconds(len(audio_data))
                allowed, used_before = reserve_spoken_seconds(
                    current_user.id, current_user.plan, reserved
                )
                if not allowed:
                    record_wall_hit(db, current_user.id)
                    await manager.send_message(scoped_session_id, {
                        "type": "quota_exceeded",
                        "spoken_seconds_used": used_before,
                        "spoken_seconds_limit": settings.FREE_DAILY_SPOKEN_SECONDS,
                        "resets_at": quota_resets_at().isoformat(),
                    })
                    continue

                spoken = await manager.handle_audio_chunk(
                    scoped_session_id,
                    data.get("audio_data"),
                    data.get("mime_type", "audio/webm"),
                    data.get("target_lang"),
                )

                # Settle in the same place the reservation was taken, so every
                # path that ends without a transcription — too large, busy,
                # provider failure — gives the estimate back. A turn the user
                # never got an answer to costs them nothing.
                total = settle_spoken_seconds(current_user.id, reserved, spoken or 0.0)
                # Live gauge update. Only the running total travels — the client
                # already knows its plan and limit from GET /api/users/me/quota.
                await manager.send_message(scoped_session_id, {
                    "type": "quota_update",
                    "spoken_seconds_used": total,
                })

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
