from typing import Literal

from pydantic import BaseModel, EmailStr, Field

# The reasons offered by the form; the value is what is stored and mailed.
Topic = Literal["question", "bug", "data", "suggestion"]


class ContactRequest(BaseModel):
    topic: Topic
    email: EmailStr
    message: str = Field(..., min_length=10, max_length=4000)
    # A field no person ever sees or fills: robots fill every input they find.
    website: str = Field(default="", max_length=200)
