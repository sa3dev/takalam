from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request
from app.config.settings import settings
from app.core.redis_client import client as _redis


def get_client_ip(request: Request) -> str:
    """Real client IP for rate limiting, resistant to X-Forwarded-For spoofing.

    All legitimate API traffic reaches this backend through the Next.js proxy,
    so request.client.host is the proxy IP (identical for every user). The real
    client IP lives in X-Forwarded-For. A malicious client can prepend fake
    entries, but each trusted proxy *appends* the peer it received from, so the
    real client sits at position -TRUSTED_PROXY_COUNT from the right — anything
    the client spoofs stays further left and is ignored.
    """
    hops = settings.TRUSTED_PROXY_COUNT
    if hops > 0:
        xff = request.headers.get("X-Forwarded-For")
        if xff:
            parts = [p.strip() for p in xff.split(",") if p.strip()]
            if len(parts) >= hops:
                return parts[-hops]
    return get_remote_address(request)


limiter = Limiter(
    key_func=get_client_ip,
    storage_uri=settings.REDIS_URL,
)


# --- WebSocket conversation-turn limits (per authenticated user) --------------
# Each turn triggers a paid STT + LLM + TTS pipeline, so cap it independently of
# the HTTP limiter (which is keyed by IP). Fixed windows via Redis counters.
WS_TURNS_PER_MINUTE = 15
WS_TURNS_PER_DAY = 300


def check_ws_turn_limit(user_id: int) -> bool:
    """Return True if the user may run another conversation turn, False if over
    the per-minute or per-day budget. Rejected turns cost nothing downstream
    since this is checked before any provider call."""
    minute_key = f"ws_turns:min:{user_id}"
    minute_count = _redis.incr(minute_key)
    if minute_count == 1:
        _redis.expire(minute_key, 60)
    if minute_count > WS_TURNS_PER_MINUTE:
        return False

    day_key = f"ws_turns:day:{user_id}"
    day_count = _redis.incr(day_key)
    if day_count == 1:
        _redis.expire(day_key, 86_400)
    return day_count <= WS_TURNS_PER_DAY
