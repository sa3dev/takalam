import bcrypt
import uuid
import redis
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.config.settings import settings

_redis = redis.from_url(settings.REDIS_URL, decode_responses=True)


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


def create_ws_ticket(user_id: int) -> str:
    ticket = str(uuid.uuid4())
    _redis.setex(f"ws_ticket:{ticket}", 60, str(user_id))
    return ticket


def consume_ws_ticket(ticket: str) -> int:
    """Atomic get-and-delete — guarantees one-time use even under concurrent requests."""
    user_id = _redis.getdel(f"ws_ticket:{ticket}")
    if user_id is None:
        raise ValueError("Invalid or expired ticket")
    return int(user_id)
