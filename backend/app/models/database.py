from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, Float, ForeignKey, Text, Boolean, Date, UniqueConstraint
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


PLAN_FREE = "free"
PLAN_PRO = "pro"


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

    # Freemium plan — "free" (daily spoken-minutes quota) or "pro" (uncapped).
    # No billing integration yet: Pro is granted manually while we measure
    # paywall intent, so this column is the single source of truth for access.
    plan = Column(String, nullable=False, server_default=PLAN_FREE, default=PLAN_FREE)
    plan_updated_at = Column(DateTime, nullable=True)

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
    # Seconds the learner actually spoke in this conversation (as opposed to
    # duration_seconds, the wall-clock length). Sum of the turns' audio durations.
    spoken_seconds = Column(Float, nullable=False, server_default="0", default=0.0)
    # Role-play situation this conversation was started from; None is free talk.
    scenario_id = Column(String, nullable=True)

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

    # Shadow Feedback Data
    grammar_corrections = Column(JSON, default=list)  # [{"input": str, "output": str, "explanation": str}]
    vocabulary_new = Column(JSON, default=list)  # [str]

    # Retired in V1 — nothing writes or reads these any more. They only ever held
    # numbers the analyser invented from a transcript stripped of the hesitations
    # and tone they claimed to measure. Kept unmigrated so historical rows survive
    # and the decision stays reversible; drop them once it is settled.
    fluency_score = Column(Integer, nullable=True)  # 0-100
    confidence_level = Column(Integer, nullable=True)  # 0-100

    # Additional metrics
    total_words_spoken = Column(Integer, default=0)
    average_response_time = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    session = relationship("Session", back_populates="analytics")


class PasswordResetToken(Base):
    """A single-use link to choose a new password.

    Only the SHA-256 of the token is stored: the token itself exists in the
    email alone, so a read of this table (a backup, a leak) cannot be turned
    into account takeovers."""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)


class DailyUsage(Base):
    """Seconds a learner spoke on one UTC day, kept for good.

    The live counter that enforces the free allowance sits in Redis and
    expires, so without this table there is no history to decide the length of
    the free allowance from. One row per user per day; `plan` is the plan they
    had when they spoke, since it changes the meaning of the number."""
    __tablename__ = "daily_usage"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_daily_usage_user_day"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    day = Column(Date, nullable=False, index=True)
    spoken_seconds = Column(Float, nullable=False, default=0.0)
    turns = Column(Integer, nullable=False, default=0)
    plan = Column(String, nullable=False, default=PLAN_FREE)


class ContactMessage(Base):
    """A message sent through the public contact form. Always stored, so a
    failed email never loses one; `notified` says whether the owner was told."""
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    email = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notified = Column(Boolean, nullable=False, default=False)


class PaywallEvent(Base):
    """Measure-first funnel: both halves of the conversion rate in one table.

    "wall_hit" is the denominator (a free user ran out of daily minutes and was
    shown the upgrade screen, recorded once per user per day), "interest" is the
    numerator (they clicked through and picked a billing period). Comparing the
    two tells us whether the price or the wall is the problem — before writing
    any billing code.
    """
    __tablename__ = "paywall_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event = Column(String, nullable=False)  # "wall_hit" | "interest"
    plan_choice = Column(String, nullable=True)  # "monthly" | "annual", interest only
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


FEEDBACK_RATINGS = ("good", "ok", "bad")


class SessionFeedback(Base):
    """How a conversation felt, in the learner's own words, asked once as it ends.

    One row per session: a tap on a face is stored at once and the optional
    comment that follows replaces it, so a learner who stops after the face
    still leaves a signal. Free text is personal data and goes with the account."""
    __tablename__ = "session_feedback"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rating = Column(String, nullable=False)  # "good" | "ok" | "bad"
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class TesterSurvey(Base):
    """The tester questionnaire, answered inside the app.

    One row per account, answers kept as one JSON object keyed by question so
    the questions can change without a migration. Free text is personal data and
    goes with the account."""
    __tablename__ = "tester_survey"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    answers = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def init_db():
    """Run pending Alembic migrations on startup."""
    from alembic.config import Config
    from alembic import command
    alembic_cfg = Config("/app/alembic.ini")
    # Keep the logging app.main set up; see migrations/env.py.
    alembic_cfg.attributes["configure_logger"] = False
    command.upgrade(alembic_cfg, "head")
