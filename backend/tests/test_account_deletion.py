"""RGPD erasure — the path that broke the day paywall_events was added."""
import pytest
from fastapi import Response
from sqlalchemy.exc import IntegrityError

from app.models.database import PaywallEvent, Session as DBSession, Transcription, User
from app.routes.auth import delete_account


def test_foreign_keys_are_actually_enforced(db):
    """Guard for the test below: SQLite ignores foreign keys unless asked, and a
    silent no-op here would make the erasure test prove nothing."""
    db.add(PaywallEvent(user_id=999_999, event="wall_hit"))

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_erasure_removes_everything_referencing_the_account(db, redis_stub, user):
    session = DBSession(user_id=user.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    db.add(Transcription(session_id=session.id, speaker="user", text="مرحبا"))
    db.add(PaywallEvent(user_id=user.id, event="wall_hit"))
    db.add(PaywallEvent(user_id=user.id, event="interest", plan_choice="annual"))
    db.commit()

    delete_account(response=Response(), current_user=user, db=db)

    # Before the fix this raised: paywall_events still referenced the user, and
    # erasure failed for exactly the people who had engaged with the paywall.
    assert db.query(User).count() == 0
    assert db.query(PaywallEvent).count() == 0
    assert db.query(DBSession).count() == 0
    assert db.query(Transcription).count() == 0
