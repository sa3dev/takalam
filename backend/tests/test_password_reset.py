"""Forgotten passwords: a single-use link that proves the mailbox, and says nothing about who has an account."""
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.rate_limit import limiter
from app.core.security import get_password_hash, verify_password
from app.main import app
from app.models.database import PasswordResetToken, User, get_db
from app.services import password_reset


@pytest.fixture
def client(db, monkeypatch):
    app.dependency_overrides[get_db] = lambda: db
    monkeypatch.setattr(limiter, "enabled", False)
    emails = []

    async def fake_send(email, token):
        emails.append((email, token))
        return True

    monkeypatch.setattr(password_reset, "send_reset_email", fake_send)
    try:
        test_client = TestClient(app)
        test_client.emails = emails
        yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def account(db):
    user = User(email="learner@example.com", username="learner", hashed_password=get_password_hash("old-password"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _request_link(client, db, email="learner@example.com"):
    client.post("/api/auth/forgot-password", json={"email": email})
    return client.emails[-1][1]


def test_asking_for_a_link_answers_the_same_for_unknown_addresses(client, account):
    known = client.post("/api/auth/forgot-password", json={"email": "learner@example.com"})
    unknown = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})

    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    assert [email for email, _ in client.emails] == ["learner@example.com"]


def test_only_the_hash_of_the_token_is_stored(client, db, account):
    token = _request_link(client, db)

    row = db.query(PasswordResetToken).one()
    assert row.token_hash != token and token not in row.token_hash
    assert len(token) >= 40


def test_the_link_changes_the_password_signs_in_and_works_once(client, db, account):
    token = _request_link(client, db)

    first = client.post("/api/auth/reset-password", json={"token": token, "password": "brand-new-pass"})
    assert first.status_code == 200
    assert "takalam_token" in first.cookies or first.headers.get("set-cookie")
    db.refresh(account)
    assert verify_password("brand-new-pass", account.hashed_password)
    assert not verify_password("old-password", account.hashed_password)

    again = client.post("/api/auth/reset-password", json={"token": token, "password": "another-pass-1"})
    assert again.status_code == 400


def test_an_expired_link_is_refused(client, db, account):
    token = _request_link(client, db)
    row = db.query(PasswordResetToken).one()
    row.expires_at = datetime.utcnow() - timedelta(seconds=1)
    db.commit()

    response = client.post("/api/auth/reset-password", json={"token": token, "password": "brand-new-pass"})

    assert response.status_code == 400
    db.refresh(account)
    assert verify_password("old-password", account.hashed_password)


def test_a_guessed_token_is_refused(client, account):
    response = client.post("/api/auth/reset-password", json={"token": "x" * 43, "password": "brand-new-pass"})
    assert response.status_code == 400


def test_a_short_password_is_refused_and_keeps_the_link_usable(client, db, account):
    token = _request_link(client, db)

    assert client.post("/api/auth/reset-password", json={"token": token, "password": "short"}).status_code == 422
    assert client.post("/api/auth/reset-password", json={"token": token, "password": "long-enough-1"}).status_code == 200


def test_a_newer_request_retires_the_older_link(db, account):
    first = password_reset.issue_token(db, account)
    # Past the cooldown, so a second link may be issued.
    db.query(PasswordResetToken).update({"created_at": datetime.utcnow() - timedelta(minutes=5)})
    db.commit()
    second = password_reset.issue_token(db, account)

    assert password_reset.find_valid_token(db, first) is None
    assert password_reset.find_valid_token(db, second) is not None


def test_requests_in_quick_succession_send_one_email(client, db, account):
    client.post("/api/auth/forgot-password", json={"email": "learner@example.com"})
    client.post("/api/auth/forgot-password", json={"email": "learner@example.com"})

    assert len(client.emails) == 1


def test_the_email_links_to_the_reset_page(monkeypatch):
    import asyncio
    sent = {}

    async def fake_send_email(to, subject, text, reply_to=None):
        sent.update(to=to, subject=subject, text=text)
        return True

    monkeypatch.setattr(password_reset, "send_email", fake_send_email)
    monkeypatch.setattr(password_reset.settings, "FRONTEND_URL", "https://takalamapp.com/")

    asyncio.run(password_reset.send_reset_email("a@b.co", "TOKEN123"))

    assert sent["to"] == "a@b.co"
    assert "https://takalamapp.com/reset-password?token=TOKEN123" in sent["text"]
