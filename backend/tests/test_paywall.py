"""Paywall funnel: the denominator must not lie."""
from app.models.database import PaywallEvent
from app.services.paywall import EVENT_INTEREST, EVENT_WALL_HIT, record_interest, record_wall_hit


def _events(db, event: str) -> list[PaywallEvent]:
    return db.query(PaywallEvent).filter(PaywallEvent.event == event).all()


def test_wall_hit_is_recorded_once_per_user_per_day(db, redis_stub, user):
    # A walled user who keeps talking emits a refusal per attempt.
    record_wall_hit(db, user.id)
    record_wall_hit(db, user.id)
    record_wall_hit(db, user.id)

    # One denominator entry, otherwise conversion would look far worse than it is.
    assert len(_events(db, EVENT_WALL_HIT)) == 1


def test_wall_hit_is_recorded_again_the_next_day(db, redis_stub, user, freeze_utc_date):
    freeze_utc_date("app.services.paywall", "2026-07-30")
    record_wall_hit(db, user.id)

    freeze_utc_date("app.services.paywall", "2026-07-31")
    record_wall_hit(db, user.id)

    # Being walled on two separate days is two data points, not a duplicate.
    assert len(_events(db, EVENT_WALL_HIT)) == 2


def test_interest_is_not_deduplicated(db, redis_stub, user):
    record_interest(db, user.id, "monthly")
    record_interest(db, user.id, "annual")

    # Coming back to the paywall is a stronger signal, not noise.
    events = _events(db, EVENT_INTEREST)
    assert [e.plan_choice for e in events] == ["monthly", "annual"]


def test_analytics_failure_never_breaks_the_conversation(db, redis_stub, user, monkeypatch):
    def explode(_instance):
        raise RuntimeError("database is on fire")

    monkeypatch.setattr(type(db), "add", explode)

    # No exception escapes: a lost metric beats a dropped conversation.
    record_wall_hit(db, user.id)
