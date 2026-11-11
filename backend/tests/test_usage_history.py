from datetime import datetime

from app.models.database import DailyUsage
from app.services.usage_history import record_spoken_seconds


def test_a_days_turns_add_up_in_one_row(db, user):
    record_spoken_seconds(db, user.id, "free", 10.5)
    record_spoken_seconds(db, user.id, "free", 4.0)

    row = db.query(DailyUsage).one()
    assert (row.spoken_seconds, row.turns, row.plan) == (14.5, 2, "free")
    assert row.day == datetime.utcnow().date()


def test_a_turn_with_no_speech_leaves_no_trace(db, user):
    record_spoken_seconds(db, user.id, "free", 0.0)
    assert db.query(DailyUsage).count() == 0


def test_the_plan_at_the_time_is_kept(db, user):
    record_spoken_seconds(db, user.id, "free", 5)
    record_spoken_seconds(db, user.id, "pro", 5)
    assert db.query(DailyUsage).one().plan == "pro"


def test_erasure_removes_the_history_too(db, redis_stub, user):
    from fastapi import Response
    from app.routes.auth import delete_account
    from app.models.database import User

    record_spoken_seconds(db, user.id, "free", 30)
    delete_account(response=Response(), current_user=user, db=db)

    assert db.query(User).count() == 0
    assert db.query(DailyUsage).count() == 0
