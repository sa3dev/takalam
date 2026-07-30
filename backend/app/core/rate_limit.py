from datetime import datetime, timedelta, timezone
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request
from app.config.settings import settings
from app.core.redis_client import client as _redis
from app.models.database import PLAN_PRO


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


# --- Freemium daily quota (per authenticated user) ----------------------------
# A distinct layer from the turn cap above, and deliberately so. The turn cap is
# an abuse/cost ceiling that applies to *everyone*, Pro included — "unlimited" is
# a commercial promise, never a technical one. The quota below is the product
# limit that Pro lifts. Keeping them separate keeps their messages honest: a fast
# talker hits "slow down", not a sales screen.

# Two days, so the counter outlives its UTC date and is cleaned up on its own.
_QUOTA_TTL_SECONDS = 172_800


def _quota_key(user_id: int) -> str:
    """Redis key for today's consumption. The UTC date in the key *is* the reset
    mechanism — no cron, no timer, a new day is simply a new key."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"quota:spoken:{user_id}:{today}"


def quota_resets_at() -> datetime:
    """Next UTC midnight — when the counter rolls over to a fresh key."""
    tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
    return datetime.combine(tomorrow, datetime.min.time(), tzinfo=timezone.utc)


def get_spoken_seconds_today(user_id: int) -> int:
    return int(_redis.get(_quota_key(user_id)) or 0)


def has_quota_left(user_id: int, plan: str) -> bool:
    """Checked before a turn starts. A user with even one second left is allowed
    to begin, and the turn runs to completion — we never cut someone off
    mid-sentence, so the day's total can overshoot the limit by one utterance.
    That overshoot is intentional: a hard stop mid-word is exactly the judgment
    this product promises not to deliver."""
    if plan == PLAN_PRO:
        return True
    return get_spoken_seconds_today(user_id) < settings.FREE_DAILY_SPOKEN_SECONDS


def consume_spoken_seconds(user_id: int, seconds: float) -> int:
    """Record actual speech after transcription. Returns the new daily total."""
    key = _quota_key(user_id)
    amount = max(0, round(seconds))
    total = _redis.incrby(key, amount)
    if total == amount:  # key was just created — bound its lifetime once
        _redis.expire(key, _QUOTA_TTL_SECONDS)
    return total
