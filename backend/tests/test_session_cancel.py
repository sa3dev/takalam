import asyncio

from app.core.redis_client import client as redis_client
from app.models.database import Session as DBSession, SessionAnalytics, Transcription, User
from app.services.session_cleanup import delete_user_sessions
from app.websocket.manager import manager


def _session(db, user_id):
    session = DBSession(user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    db.add(Transcription(session_id=session.id, speaker="user", text="مرحبا"))
    db.add(SessionAnalytics(session_id=session.id))
    db.commit()
    return session


def test_the_helper_only_touches_the_owners_rows(db, user):
    stranger = User(email="other@example.com", username="other", hashed_password="x")
    db.add(stranger)
    db.commit()
    db.refresh(stranger)
    mine = _session(db, user.id)
    theirs = _session(db, stranger.id)

    assert delete_user_sessions(db, user.id, [mine.id, theirs.id]) == 1
    assert [s.id for s in db.query(DBSession).all()] == [theirs.id]


def _connect(sid, processing=False):
    manager.session_data[sid] = {
        "transcriptions": [{"speaker": "user", "text": "x"}],
        "is_processing": processing,
        "user_id": 7,
    }


def test_cancelling_clears_the_conversation_memory(redis_stub):
    sid = "7:cancel"
    _connect(sid)
    manager._save_history(sid, [{"role": "user", "content": "x"}])
    manager.remember_db_session(sid, 99)
    manager.remember_scenario(sid, "restaurant")

    cancelled = asyncio.run(manager.cancel_session(sid, None))

    assert cancelled is True
    assert manager._get_history(sid) == []
    assert manager.recall_db_session(sid) is None
    assert manager.recall_scenario(sid) is None
    assert manager.session_data[sid]["transcriptions"] == []
    manager.session_data.pop(sid)


def test_a_turn_in_flight_blocks_the_cancel(redis_stub):
    sid = "7:busy"
    _connect(sid, processing=True)
    manager._save_history(sid, [{"role": "user", "content": "x"}])

    assert asyncio.run(manager.cancel_session(sid, None)) is False
    assert manager._get_history(sid) != []
    manager.session_data.pop(sid)
