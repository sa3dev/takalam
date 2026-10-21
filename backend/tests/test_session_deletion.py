"""Deleting sessions from the dashboard: the caller's own, and nobody else's."""
from app.models.database import (
    Session as DBSession,
    SessionAnalytics,
    Transcription,
    User,
)
from app.routes.api import delete_my_sessions
from app.schemas.session import SessionDeleteRequest


def _session_with_content(db, user_id):
    session = DBSession(user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    db.add(Transcription(session_id=session.id, speaker="user", text="مرحبا"))
    db.add(SessionAnalytics(session_id=session.id))
    db.commit()
    return session


def test_deleting_sessions_removes_their_transcriptions_and_analytics(db, user):
    first = _session_with_content(db, user.id)
    second = _session_with_content(db, user.id)
    kept = _session_with_content(db, user.id)

    result = delete_my_sessions(
        SessionDeleteRequest(ids=[first.id, second.id]), db=db, current_user=user
    )

    assert result == {"deleted": 2}
    assert [s.id for s in db.query(DBSession).all()] == [kept.id]
    assert db.query(Transcription).count() == 1
    assert db.query(SessionAnalytics).count() == 1


def test_someone_elses_sessions_are_left_alone(db, user):
    stranger = User(email="other@example.com", username="other", hashed_password="x")
    db.add(stranger)
    db.commit()
    db.refresh(stranger)
    theirs = _session_with_content(db, stranger.id)
    mine = _session_with_content(db, user.id)

    result = delete_my_sessions(
        SessionDeleteRequest(ids=[theirs.id, mine.id]), db=db, current_user=user
    )

    # The foreign id is ignored, not reported: the endpoint must not reveal
    # which ids exist.
    assert result == {"deleted": 1}
    assert db.query(DBSession).filter(DBSession.id == theirs.id).count() == 1
    assert db.query(Transcription).filter(Transcription.session_id == theirs.id).count() == 1


def test_unknown_ids_delete_nothing(db, user):
    _session_with_content(db, user.id)

    result = delete_my_sessions(SessionDeleteRequest(ids=[999_999]), db=db, current_user=user)

    assert result == {"deleted": 0}
    assert db.query(DBSession).count() == 1
