from typing import Literal, Optional

from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    rating: Literal["good", "ok", "bad"]
    comment: Optional[str] = Field(None, max_length=1000)
