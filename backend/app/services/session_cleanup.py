from typing import Iterable

from sqlalchemy.orm import Session

from app.models.database import Session as DBSession, SessionAnalytics, Transcription


def delete_user_sessions(db: Session, user_id: int, session_ids: Iterable[int]) -> int:
    """Delete sessions with their transcriptions and analytics, and report how
    many went. Only the user's own rows are touched: any other id is ignored, so
    callers cannot learn which ids exist. Commits."""
    owned = [
        row.id
        for row in db.query(DBSession.id).filter(
            DBSession.user_id == user_id,
            DBSession.id.in_(list(session_ids)),
        )
    ]
    if owned:
        db.query(SessionAnalytics).filter(SessionAnalytics.session_id.in_(owned)).delete(synchronize_session=False)
        db.query(Transcription).filter(Transcription.session_id.in_(owned)).delete(synchronize_session=False)
        db.query(DBSession).filter(DBSession.id.in_(owned)).delete(synchronize_session=False)
        db.commit()
    return len(owned)
