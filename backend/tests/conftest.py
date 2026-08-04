"""Shared fixtures.

The quota logic decides who pays and how much, so it is tested against real
behaviour rather than mocks of itself: a Redis stub that implements the same
INCRBY/DECRBY semantics, and SQLite with foreign keys switched on so a missing
cascade fails here instead of in production.
"""
import importlib
import os
from datetime import datetime, timezone

# Settings has required fields with no defaults; give them values before any app
# module is imported. Real values come from the environment when they exist.
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

import fakeredis  # noqa: E402
import pytest  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.models.database import Base, User  # noqa: E402

# Every module binds the client at import time (`from ... import client as _redis`),
# so the stub has to be swapped in on each of them individually.
_REDIS_CONSUMERS = (
    "app.core.rate_limit",
    "app.services.paywall",
    "app.routes.auth",
)


@pytest.fixture
def redis_stub(monkeypatch):
    """In-memory Redis shared by every module under test."""
    fake = fakeredis.FakeStrictRedis(decode_responses=True)
    for module_path in _REDIS_CONSUMERS:
        module = importlib.import_module(module_path)
        monkeypatch.setattr(module, "_redis", fake, raising=False)
    return fake


@pytest.fixture
def db():
    """SQLite session with foreign keys enforced.

    SQLite ignores foreign keys unless asked; without the pragma the deletion
    test would pass while production still raised IntegrityError.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _record):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def freeze_utc_date(monkeypatch):
    """Pin the UTC date a module reads, to exercise the day rollover.

    The reset mechanism *is* the date in the Redis key, so travelling a day
    forward is the only way to test it.
    """
    def _freeze(module_path: str, iso_date: str):
        module = importlib.import_module(module_path)
        pinned = datetime.fromisoformat(iso_date).replace(tzinfo=timezone.utc)

        class _Frozen(datetime):
            @classmethod
            def now(cls, tz=None):
                return pinned if tz else pinned.replace(tzinfo=None)

        # Subclassing keeps .combine, .min and friends working untouched.
        monkeypatch.setattr(module, "datetime", _Frozen)

    return _freeze


@pytest.fixture
def user(db):
    account = User(
        email="learner@example.com",
        username="learner",
        hashed_password="not-a-real-hash",
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account
