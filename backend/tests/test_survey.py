"""The tester questionnaire: partial answers are kept, replaced not merged, and erased with the account."""
import pytest
from fastapi import Response
from pydantic import ValidationError

from app.models.database import TesterSurvey
from app.routes.auth import delete_account
from app.schemas.survey import SurveyAnswers
from app.services.survey import load_survey, save_survey


def test_a_half_filled_form_keeps_only_what_was_answered(db, user):
    save_survey(db, user.id, SurveyAnswers(arabic_type="dialect", goal="  parler à ma grand-mère  ", comfort="   "))

    assert load_survey(db, user.id) == {"arabic_type": "dialect", "goal": "parler à ma grand-mère"}


def test_saving_again_replaces_the_answers(db, user):
    save_survey(db, user.id, SurveyAnswers(goal="voyager", bug="le micro"))
    save_survey(db, user.id, SurveyAnswers(goal="voyager"))

    assert load_survey(db, user.id) == {"goal": "voyager"}
    assert db.query(TesterSurvey).count() == 1


def test_nothing_saved_reads_as_none(db, user):
    assert load_survey(db, user.id) is None


def test_unknown_questions_and_out_of_range_values_are_refused():
    with pytest.raises(ValidationError):
        SurveyAnswers(unknown="x")
    with pytest.raises(ValidationError):
        SurveyAnswers(voice_rating=6)
    with pytest.raises(ValidationError):
        SurveyAnswers(arabic_type="klingon")


def test_the_answers_go_with_the_account(db, redis_stub, user):
    save_survey(db, user.id, SurveyAnswers(advice="plus de scénarios"))

    delete_account(response=Response(), current_user=user, db=db)

    assert db.query(TesterSurvey).count() == 0
