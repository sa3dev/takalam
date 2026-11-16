"""The question asked once a conversation ends: how did it go?"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.database import Session as DBSession, SessionFeedback


def record_feedback(
    db: Session, user_id: int, session_id: int, rating: str, comment: Optional[str]
) -> bool:
    """Store or replace the feedback for one of the user's own sessions.

    Returns False when the session does not exist or is not theirs, without
    saying which, so ids cannot be probed. The face is saved first and the
    comment replaces the row later, which is why this is an upsert."""
    owned = (
        db.query(DBSession.id)
        .filter(DBSession.id == session_id, DBSession.user_id == user_id)
        .first()
    )
    if owned is None:
        return False
    text = (comment or "").strip() or None
    row = db.query(SessionFeedback).filter(SessionFeedback.session_id == session_id).first()
    if row is None:
        db.add(SessionFeedback(session_id=session_id, user_id=user_id, rating=rating, comment=text))
    else:
        row.rating = rating
        # A later tap on another face must not wipe a comment already written.
        if text is not None:
            row.comment = text
    db.commit()
    return True
