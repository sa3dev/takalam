from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, Float, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from app.config.settings import settings

# Database setup
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Dependency for FastAPI
def get_db():
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Models
class User(Base):
    """User model."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    sessions = relationship("Session", back_populates="user")


class Session(Base):
    """Conversation session model."""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="sessions")
    transcriptions = relationship("Transcription", back_populates="session")
    analytics = relationship("SessionAnalytics", back_populates="session", uselist=False)


class Transcription(Base):
    """Audio transcription model."""
    __tablename__ = "transcriptions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    speaker = Column(String, nullable=False)  # "user" or "assistant"
    text = Column(Text, nullable=False)
    language = Column(String, default="ar")
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("Session", back_populates="transcriptions")


class SessionAnalytics(Base):
    """Shadow feedback analytics for each session."""
    __tablename__ = "session_analytics"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), unique=True, nullable=False)

    # Shadow Feedback Data (JSON structure as per CONTEXT.md)
    grammar_corrections = Column(JSON, default=list)  # [{"input": str, "output": str, "explanation": str}]
    vocabulary_new = Column(JSON, default=list)  # [str]
    fluency_score = Column(Integer, nullable=True)  # 0-100
    confidence_level = Column(Integer, nullable=True)  # 0-100

    # Additional metrics
    total_words_spoken = Column(Integer, default=0)
    average_response_time = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    session = relationship("Session", back_populates="analytics")


def init_db():
    """Run pending Alembic migrations on startup."""
    from alembic.config import Config
    from alembic import command
    alembic_cfg = Config("/app/alembic.ini")
    command.upgrade(alembic_cfg, "head")
