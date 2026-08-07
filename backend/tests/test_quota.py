"""Daily speaking allowance: reservation, settlement and the UTC rollover."""
from datetime import datetime, timezone

from app.config.settings import settings
from app.core.rate_limit import (
    estimate_spoken_seconds,
    get_global_spoken_seconds_today,
    get_spoken_seconds_today,
    quota_resets_at,
    reserve_spoken_seconds,
    settle_spoken_seconds,
)
from app.models.database import PLAN_FREE, PLAN_PRO

USER_ID = 4242
LIMIT = settings.FREE_DAILY_SPOKEN_SECONDS


def _burn(user_id: int, seconds: int) -> None:
    """Spend `seconds` of the daily allowance the way a real turn would."""
    reserve_spoken_seconds(user_id, PLAN_FREE, seconds)
    settle_spoken_seconds(user_id, seconds, seconds)


def test_settlement_records_the_real_duration_not_the_estimate(redis_stub):
    reserved = estimate_spoken_seconds(120_000)  # a chunk far longer than the speech
    allowed, used_before = reserve_spoken_seconds(USER_ID, PLAN_FREE, reserved)
    assert allowed is True
    assert used_before == 0

    total = settle_spoken_seconds(USER_ID, reserved, actual_seconds=4.2)

    assert total == 4
    assert get_spoken_seconds_today(USER_ID) == 4


def test_a_turn_that_never_transcribed_costs_nothing(redis_stub):
    _burn(USER_ID, 100)
    reserved = 60.0
    reserve_spoken_seconds(USER_ID, PLAN_FREE, reserved)

    # Provider failure, oversized chunk, busy session — all settle at zero.
    total = settle_spoken_seconds(USER_ID, reserved, actual_seconds=0)

    assert total == 100
    assert get_spoken_seconds_today(USER_ID) == 100


def test_free_user_is_refused_once_the_allowance_is_spent(redis_stub):
    _burn(USER_ID, LIMIT)

    allowed, used_before = reserve_spoken_seconds(USER_ID, PLAN_FREE, 30)

    assert allowed is False
    assert used_before == LIMIT
    # A refused reservation must hand its claim straight back, otherwise every
    # rejected attempt would inflate the total the user is shown.
    assert get_spoken_seconds_today(USER_ID) == LIMIT


def test_one_second_left_still_buys_a_whole_turn(redis_stub):
    _burn(USER_ID, LIMIT - 1)

    allowed, _ = reserve_spoken_seconds(USER_ID, PLAN_FREE, 45)

    # Deliberate: nobody gets cut off mid-sentence, so the day may overshoot by
    # one utterance.
    assert allowed is True


def test_parallel_turns_cannot_both_claim_the_last_second(redis_stub):
    """Regression: checking then charging let two tabs read the same total and
    each conclude it had room. The reservation is now the atomic step."""
    _burn(USER_ID, LIMIT - 1)

    first, _ = reserve_spoken_seconds(USER_ID, PLAN_FREE, 45)
    second, _ = reserve_spoken_seconds(USER_ID, PLAN_FREE, 45)

    assert first is True
    assert second is False


def test_pro_is_metered_but_never_refused(redis_stub):
    _burn(USER_ID, LIMIT * 3)

    allowed, used_before = reserve_spoken_seconds(USER_ID, PLAN_PRO, 30)

    assert allowed is True
    assert used_before == LIMIT * 3
    # Still counted: "unlimited" is a commercial promise, and we want the numbers.
    settle_spoken_seconds(USER_ID, 30, 30)
    assert get_spoken_seconds_today(USER_ID) == LIMIT * 3 + 30


def test_counter_starts_from_zero_on_the_next_utc_day(redis_stub, freeze_utc_date):
    freeze_utc_date("app.core.rate_limit", "2026-07-30")
    _burn(USER_ID, 300)
    assert get_spoken_seconds_today(USER_ID) == 300

    freeze_utc_date("app.core.rate_limit", "2026-07-31")

    assert get_spoken_seconds_today(USER_ID) == 0
    allowed, used_before = reserve_spoken_seconds(USER_ID, PLAN_FREE, 30)
    assert allowed is True
    assert used_before == 0


def test_quota_resets_at_the_next_utc_midnight(freeze_utc_date):
    freeze_utc_date("app.core.rate_limit", "2026-07-30")

    assert quota_resets_at() == datetime(2026, 7, 31, tzinfo=timezone.utc)


def test_estimate_leans_long_rather_than_short():
    """The estimate is provisional, so erring high is the safe direction: it
    never refuses the turn being started, it only narrows what a parallel turn
    can claim before the real duration replaces it."""
    one_megabyte_of_base64 = 1_000_000

    estimate = estimate_spoken_seconds(one_megabyte_of_base64)

    # 750 KB of Opus is 2 minutes at 48 kbps, a little over 4 at 24 kbps.
    assert 240 <= estimate <= 260


def test_global_usage_accumulates_across_users(redis_stub):
    settle_spoken_seconds(1, 10, 10)
    settle_spoken_seconds(2, 10, 25)

    assert get_global_spoken_seconds_today() == 35


def test_global_usage_warns_once_when_the_threshold_is_crossed(redis_stub, caplog, monkeypatch):
    monkeypatch.setattr(settings, "DAILY_SPOKEN_SECONDS_ALERT", 100)

    with caplog.at_level("WARNING"):
        settle_spoken_seconds(1, 150, 150)
        settle_spoken_seconds(2, 150, 150)

    crossings = [r for r in caplog.records if "threshold crossed" in r.message]
    assert len(crossings) == 1
