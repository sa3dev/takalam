import bcrypt
import uuid
from jose import jwt
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple
from app.config.settings import settings


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


# In-memory ticket store for WebSocket auth — ticket → (user_id, expires_at)
# One-time use, TTL 60 seconds. Not shared across workers (single-worker constraint in prod).
_ws_tickets: Dict[str, Tuple[int, datetime]] = {}


def create_ws_ticket(user_id: int) -> str:
    ticket = str(uuid.uuid4())
    _ws_tickets[ticket] = (user_id, datetime.now(timezone.utc) + timedelta(seconds=60))
    return ticket


def consume_ws_ticket(ticket: str) -> int:
    """Pop-and-validate — each ticket can only be used once."""
    entry = _ws_tickets.pop(ticket, None)
    if entry is None:
        raise ValueError("Invalid ticket")
    user_id, expires_at = entry
    if datetime.now(timezone.utc) > expires_at:
        raise ValueError("Ticket expired")
    return user_id
