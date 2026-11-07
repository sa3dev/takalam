"""The public contact form: stored first, announced second, robots ignored."""
import asyncio

import pytest
from fastapi.testclient import TestClient

from app.core.rate_limit import limiter
from app.main import app
from app.models.database import ContactMessage, get_db
from app.services import contact_mail

GOOD = {"topic": "bug", "email": "someone@example.com", "message": "Le micro ne répond plus depuis hier."}


class _KeepOpen:
    """The announcement opens its own session; here it should reuse the test one."""

    def __init__(self, session):
        self._session = session

    def __getattr__(self, name):
        return getattr(self._session, name)

    def close(self):
        pass


@pytest.fixture
def client(db, monkeypatch):
    app.dependency_overrides[get_db] = lambda: db
    # The hourly cap lives in Redis and would make the suite depend on how
    # recently it ran; its own behaviour is slowapi's, not ours.
    monkeypatch.setattr(limiter, "enabled", False)
    sent = []

    async def fake_notify(message_id, topic, email, message):
        sent.append((message_id, topic, email, message))
        return True

    monkeypatch.setattr("app.routes.contact.notify_contact_message", fake_notify)
    monkeypatch.setattr("app.routes.contact.SessionLocal", lambda: _KeepOpen(db))
    try:
        test_client = TestClient(app)
        test_client.sent = sent
        yield test_client
    finally:
        app.dependency_overrides.clear()


def test_a_message_is_stored_and_announced(client, db):
    response = client.post("/api/contact", json=GOOD)

    assert response.status_code == 201
    row = db.query(ContactMessage).one()
    assert (row.topic, row.email) == ("bug", "someone@example.com")
    assert client.sent and client.sent[0][1] == "bug"
    db.refresh(row)
    assert row.notified is True


def test_a_robot_gets_the_same_answer_and_leaves_nothing(client, db):
    response = client.post("/api/contact", json={**GOOD, "website": "http://spam.example"})

    assert response.status_code == 201
    assert db.query(ContactMessage).count() == 0
    assert client.sent == []


@pytest.mark.parametrize(
    "change",
    [
        {"email": "not-an-address"},
        {"topic": "invented"},
        {"message": "court"},
        {"message": "x" * 4001},
    ],
)
def test_bad_input_is_refused(client, db, change):
    assert client.post("/api/contact", json={**GOOD, **change}).status_code == 422
    assert db.query(ContactMessage).count() == 0


def test_without_a_mail_key_the_message_is_kept_and_nothing_is_sent(monkeypatch):
    monkeypatch.setattr(contact_mail.settings, "RESEND_API_KEY", None)
    assert asyncio.run(contact_mail.notify_contact_message(1, "bug", "a@b.co", "hello there")) is False


def test_the_email_carries_the_sender_as_reply_to_and_a_fixed_subject(monkeypatch):
    monkeypatch.setattr(contact_mail.settings, "RESEND_API_KEY", "key")
    monkeypatch.setattr(contact_mail.settings, "CONTACT_TO_EMAIL", "owner@example.com")
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            pass

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, headers, json):
            captured.update(url=url, headers=headers, json=json)
            return FakeResponse()

    monkeypatch.setattr(contact_mail.httpx, "AsyncClient", FakeClient)

    sent = asyncio.run(contact_mail.notify_contact_message(7, "data", "me@example.com", "Please erase\r\nBcc: x@y.z"))

    assert sent is True
    body = captured["json"]
    assert body["reply_to"] == "me@example.com"
    assert body["to"] == ["owner@example.com"]
    assert body["subject"] == "[Takalam] Mes données personnelles"
    assert "text" in body and "html" not in body
    assert captured["headers"]["Authorization"] == "Bearer key"
