from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# Grammar Correction Schema
class GrammarCorrection(BaseModel):
    """Schema for grammar correction."""
    input: str = Field(..., description="Original user input")
    output: str = Field(..., description="Corrected version")
    explanation: str = Field(..., description="Explanation of the correction")


# Shadow Feedback Schema
class ShadowFeedback(BaseModel):
    """Shadow feedback analysis schema (as per CONTEXT.md)."""
    grammar_corrections: List[GrammarCorrection] = Field(default_factory=list)
    vocabulary_new: List[str] = Field(default_factory=list)
    fluency_score: Optional[int] = Field(None, ge=0, le=100)
    confidence_level: Optional[int] = Field(None, ge=0, le=100)


# Transcription Schemas
class TranscriptionBase(BaseModel):
    """Base transcription schema."""
    speaker: str
    text: str
    language: str = "ar"
    confidence: Optional[float] = None


class TranscriptionCreate(TranscriptionBase):
    """Schema for creating a transcription."""
    session_id: int


class TranscriptionResponse(TranscriptionBase):
    """Schema for transcription response."""
    id: int
    session_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Session Schemas
class SessionCreate(BaseModel):
    """Schema for creating a session."""
    user_id: int


class SessionResponse(BaseModel):
    """Schema for session response."""
    id: int
    user_id: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: int

    class Config:
        from_attributes = True


# Analytics Schemas
class AnalyticsResponse(BaseModel):
    """Schema for analytics response."""
    session_id: int
    grammar_corrections: List[dict]
    vocabulary_new: List[str]
    fluency_score: Optional[int]
    confidence_level: Optional[int]
    total_words_spoken: int
    average_response_time: Optional[float]

    class Config:
        from_attributes = True


# WebSocket Message Schemas
class AudioChunk(BaseModel):
    """Schema for audio chunk messages."""
    audio_data: str  # Base64 encoded audio
    format: str = "webm"
    sample_rate: int = 16000


class TranscriptionMessage(BaseModel):
    """Schema for transcription WebSocket messages."""
    type: str = "transcription"
    speaker: str
    text: str
    is_final: bool = False


class ErrorMessage(BaseModel):
    """Schema for error WebSocket messages."""
    type: str = "error"
    message: str
    code: Optional[str] = None
