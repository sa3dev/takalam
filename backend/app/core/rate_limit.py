import logging
from datetime import datetime, timedelta, timezone
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request
from app.config.settings import settings
from app.core.redis_client import client as _redis
from app.models.database import PLAN_PRO

logger = logging.getLogger(__name__)


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


# Opus from MediaRecorder runs roughly 24–48 kbps. Dividing by the *low* end
# overestimates the duration, and that error points the safe way: the estimate is
# only ever claimed provisionally, so an overestimate never refuses the turn being
# started — it just narrows the room left for a turn started in parallel, and the
# real duration replaces it moments later.
_ESTIMATED_BYTES_PER_SECOND = 3000


def estimate_spoken_seconds(audio_b64_len: int) -> float:
    """Duration a base64 audio payload is likely to hold, before transcription."""
    return (audio_b64_len * 0.75) / _ESTIMATED_BYTES_PER_SECOND


def reserve_spoken_seconds(user_id: int, plan: str, estimated_seconds: float) -> tuple[bool, int]:
    """Claim an estimate of the turn *before* transcribing, and report whether
    there was room. Returns (allowed, seconds_already_used_today).

    Claiming first is what makes the limit hold across tabs: checking then
    charging let several connections read the same total and each conclude it had
    room. Here the increment is atomic, so exactly one of them can find the day
    still open.

    A user with even one second left is allowed to begin and the turn runs to
    completion — we never cut someone off mid-sentence, so the day can overshoot
    by one utterance. That overshoot is intentional: a hard stop mid-word is
    exactly the judgment this product promises not to deliver.
    """
    key = _quota_key(user_id)
    amount = max(1, round(estimated_seconds))
    total = _redis.incrby(key, amount)
    if total == amount:  # key was just created — bound its lifetime once
        _redis.expire(key, _QUOTA_TTL_SECONDS)

    used_before = total - amount
    # Pro is metered for analytics but never refused.
    if plan != PLAN_PRO and used_before >= settings.FREE_DAILY_SPOKEN_SECONDS:
        _redis.decrby(key, amount)
        return False, used_before
    return True, used_before


def settle_spoken_seconds(user_id: int, reserved_seconds: float, actual_seconds: float) -> int:
    """Replace the reservation with what was really spoken, once Whisper has
    reported the duration. Returns the new daily total.

    A turn that failed to transcribe settles at 0 and gives the whole
    reservation back — a turn the user never got an answer to must not cost them
    anything.
    """
    reserved = max(1, round(reserved_seconds))
    actual = max(0, round(actual_seconds))
    delta = actual - reserved

    key = _quota_key(user_id)
    total = _redis.incrby(key, delta) if delta else int(_redis.get(key) or 0)
    if total < 0:
        # Only reachable if the UTC day rolled over between reserving and
        # settling, so the refund landed on a fresh key. Floor it rather than
        # hand the user a negative allowance.
        _redis.set(key, 0, ex=_QUOTA_TTL_SECONDS)
        total = 0

    _track_global_usage(actual)
    return total


# --- Observability ------------------------------------------------------------
# No metrics stack here yet, so the cheapest useful signal is a daily counter and
# a log line loud enough to alert on. Cost scales with seconds transcribed, so
# that is what gets counted.

def _usage_key() -> str:
    return f"usage:spoken:all:{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"


def get_global_spoken_seconds_today() -> int:
    return int(_redis.get(_usage_key()) or 0)


def _track_global_usage(seconds: int) -> None:
    """Accumulate spoken seconds across all users and warn once a day when the
    total crosses the alert threshold."""
    if seconds <= 0:
        return
    try:
        key = _usage_key()
        total = _redis.incrby(key, seconds)
        if total == seconds:
            _redis.expire(key, _QUOTA_TTL_SECONDS)

        threshold = settings.DAILY_SPOKEN_SECONDS_ALERT
        if threshold > 0 and total >= threshold:
            # nx so a crossed threshold is reported once, not on every turn after.
            if _redis.set(f"{key}:alerted", 1, ex=_QUOTA_TTL_SECONDS, nx=True):
                logger.warning(
                    "Daily spoken-seconds threshold crossed: %ds transcribed today "
                    "(threshold %ds) — check provider spend",
                    total, threshold,
                )
    except Exception as e:  # metrics must never break a conversation
        logger.warning("Could not record global usage: %s", e)
