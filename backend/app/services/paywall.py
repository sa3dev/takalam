"""Measure-first paywall instrumentation.

There is no billing integration yet by design: before writing checkout code we
want to know whether anyone actually wants to pay. This module records the two
numbers that answer that — how many free users hit the daily wall, and how many
of them then asked to upgrade — so the conversion rate is a query, not a guess.
"""
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.redis_client import client as _redis
from app.models.database import PaywallEvent

logger = logging.getLogger(__name__)

EVENT_WALL_HIT = "wall_hit"
EVENT_INTEREST = "interest"

PLAN_CHOICES = ("monthly", "annual")

_WALL_HIT_TTL_SECONDS = 172_800


def record_wall_hit(db: Session, user_id: int) -> None:
    """Log that a free user was shown the upgrade screen.

    Deduplicated to once per user per UTC day: a user who keeps talking after
    running out would otherwise emit an event per rejected turn, inflating the
    denominator and making conversion look far worse than it is.

    Never raises — analytics must not be able to break a conversation.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        if not _redis.set(f"paywall:wall_hit:{user_id}:{today}", 1, ex=_WALL_HIT_TTL_SECONDS, nx=True):
            return
        db.add(PaywallEvent(user_id=user_id, event=EVENT_WALL_HIT))
        db.commit()
    except Exception as e:
        logger.warning("Could not record paywall wall_hit for user %s: %s", user_id, e)
        db.rollback()


def record_interest(db: Session, user_id: int, plan_choice: str) -> None:
    """Log that a user clicked through the paywall and picked a billing period.

    Not deduplicated: a user returning to the paywall a second time is a
    stronger signal, not a duplicate, and we want to keep it.
    """
    db.add(PaywallEvent(user_id=user_id, event=EVENT_INTEREST, plan_choice=plan_choice))
    db.commit()
