"""The end-of-conversation question: owned sessions only, and no lost comments."""
from app.models.database import Session as DBSession, SessionFeedback, User
from app.services.feedback import record_feedback
from app.services.session_cleanup import delete_user_sessions


def _session(db, user_id):
    s = DBSession(user_id=user_id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def test_a_face_is_stored_then_the_comment_completes_it(db, user):
    s = _session(db, user.id)

    assert record_feedback(db, user.id, s.id, "bad", None)
    assert record_feedback(db, user.id, s.id, "bad", "  La voix coupe mes phrases  ")

    row = db.query(SessionFeedback).one()
    assert (row.rating, row.comment) == ("bad", "La voix coupe mes phrases")


def test_changing_face_keeps_the_comment_already_written(db, user):
    s = _session(db, user.id)
    record_feedback(db, user.id, s.id, "bad", "trop rapide")

    record_feedback(db, user.id, s.id, "ok", None)

    row = db.query(SessionFeedback).one()
    assert (row.rating, row.comment) == ("ok", "trop rapide")


def test_someone_elses_session_cannot_be_rated(db, user):
    stranger = User(email="other@example.com", username="other", hashed_password="x")
    db.add(stranger)
    db.commit()
    theirs = _session(db, stranger.id)

    assert record_feedback(db, user.id, theirs.id, "good", None) is False
    assert record_feedback(db, user.id, 9999, "good", None) is False
    assert db.query(SessionFeedback).count() == 0


def test_deleting_a_session_removes_its_feedback(db, user):
    s = _session(db, user.id)
    record_feedback(db, user.id, s.id, "good", "super")

    delete_user_sessions(db, user.id, [s.id])

    assert db.query(SessionFeedback).count() == 0
