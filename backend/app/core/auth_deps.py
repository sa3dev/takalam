from fastapi import Depends, HTTPException, Query, Cookie
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
    """Auth for WebSocket connections via short-lived one-time ticket."""
    try:
        user_id = consume_ws_ticket(ticket)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
