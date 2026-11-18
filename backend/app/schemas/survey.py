from typing import Annotated, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

LongText = Annotated[Optional[str], Field(default=None, max_length=1500)]
ShortText = Annotated[Optional[str], Field(default=None, max_length=200)]


class SurveyAnswers(BaseModel):
    """The tester questionnaire. Every answer is optional: a tester may skip
    any question, and a half-filled form is still worth keeping."""
    model_config = ConfigDict(extra="forbid")

    usage_count: Optional[Literal["1", "2-3", "4+"]] = None
    goal: LongText
    level: Optional[Literal["beginner", "understand", "intermediate", "advanced"]] = None
    arabic_type: Optional[Literal["fusha", "dialect", "both", "unsure"]] = None
    arabic_type_detail: ShortText
    last_conversation: LongText
    comfort: LongText
    voice_rating: Optional[int] = Field(default=None, ge=1, le=5)
    voice_comment: LongText
    not_understood: LongText
    bug: LongText
    if_gone: LongText
    missing_daily: LongText
    missing_situation: LongText
    one_word: ShortText
    advice: LongText


class SurveyResponse(BaseModel):
    answers: Optional[SurveyAnswers] = None
