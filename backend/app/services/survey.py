"""The tester questionnaire: one editable set of answers per account."""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.database import TesterSurvey
from app.schemas.survey import SurveyAnswers


def _clean(answers: SurveyAnswers) -> dict:
    """Only what was answered: blanks and untouched questions are not stored."""
    data = answers.model_dump(exclude_none=True)
    return {k: (v.strip() if isinstance(v, str) else v) for k, v in data.items() if not (isinstance(v, str) and not v.strip())}


def save_survey(db: Session, user_id: int, answers: SurveyAnswers) -> None:
    """Create or replace the account's answers. Replace, not merge: the form
    always sends everything it shows, so a cleared field means "no answer"."""
    data = _clean(answers)
    row = db.query(TesterSurvey).filter(TesterSurvey.user_id == user_id).first()
    if row is None:
        db.add(TesterSurvey(user_id=user_id, answers=data))
    else:
        row.answers = data
    db.commit()


def load_survey(db: Session, user_id: int) -> Optional[dict]:
    row = db.query(TesterSurvey).filter(TesterSurvey.user_id == user_id).first()
    return row.answers if row else None
