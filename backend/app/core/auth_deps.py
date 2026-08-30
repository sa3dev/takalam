from fastapi import Depends, HTTPException, Query, Cookie, WebSocketException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from typing import Optional
from sqlalchemy.orm import Session
from app.models.database import get_db, User
from app.core.security import decode_access_token, consume_ws_ticket

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    takalam_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
) -> User:
    """Accepts Bearer token (Authorization header) or HttpOnly cookie."""
    token = credentials.credentials if credentials else takalam_token
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_ws_user(ticket: str = Query(...), db: Session = Depends(get_db)) -> User:
    """Auth for WebSocket connections via short-lived one-time ticket.

    WebSocketException, not HTTPException: there is no response to put a 401
    into during a handshake. Raising HTTPException here leaves the ASGI app
    returning without ever answering, which uvicorn reports as a 500 — so a
    ticket that merely expired (they live 60 seconds) looked like a broken
    server, and the client, seeing no reason to stop, reconnected forever.
    A close code the browser understands ends it in one round trip.
    """
    try:
        user_id = consume_ws_ticket(ticket)
    except ValueError as e:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason=str(e))

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
    return user
