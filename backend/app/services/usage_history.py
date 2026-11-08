import logging
from datetime import datetime

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models.database import DailyUsage

logger = logging.getLogger(__name__)


def record_spoken_seconds(db: Session, user_id: int, plan: str, seconds: float) -> None:
    """Add a turn's spoken seconds to the learner's row for today (UTC, the same
    day the live allowance counts).

    Best effort by design: this feeds the analysis of how the product is used,
    and a failure here must never cost a learner their turn."""
    if seconds <= 0:
        return
    today = datetime.utcnow().date()
    try:
        row = db.query(DailyUsage).filter(DailyUsage.user_id == user_id, DailyUsage.day == today).first()
        if row is None:
            db.add(DailyUsage(user_id=user_id, day=today, spoken_seconds=seconds, turns=1, plan=plan))
            db.commit()
            return
        # An increment in the database, not a read-modify-write in Python: two
        # tabs speaking at once must not overwrite each other.
        db.execute(
            update(DailyUsage)
            .where(DailyUsage.id == row.id)
            .values(
                spoken_seconds=DailyUsage.spoken_seconds + seconds,
                turns=DailyUsage.turns + 1,
                plan=plan,
            )
        )
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Could not record daily usage for user_id=%d (%s)", user_id, type(e).__name__)
