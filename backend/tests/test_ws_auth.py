"""How a WebSocket refuses a caller.

Tickets live 60 seconds and are consumed on first use, so a rejected handshake
is ordinary traffic, not an anomaly: a tab left open past the minute, a
reconnect that raced the original. What matters is that the refusal *reads* as
a refusal. An HTTPException cannot be delivered during a handshake — the ASGI
app returns without answering and uvicorn turns that into a 500, which the
client cannot tell apart from a server that fell over, so it reconnects, gets
another 500, and never stops.
"""
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.security import create_ws_ticket
from app.main import app
from app.models.database import get_db


@pytest.fixture
def client(db, redis_stub, monkeypatch):
    app.dependency_overrides[get_db] = lambda: db
    # main.py binds the real Redis at import; the WS route reads quota from it.
    import app.routes.websocket as ws_route
    monkeypatch.setattr(ws_route, "check_ws_turn_limit", lambda _uid: True, raising=False)
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def _connect(client, session_id, ticket):
    return client.websocket_connect(f"/ws/{session_id}?ticket={ticket}")


def test_an_expired_ticket_is_refused_not_a_server_error(client):
    with pytest.raises(WebSocketDisconnect) as refusal:
        with _connect(client, "conversation", "a-ticket-that-was-never-issued"):
            pass

    # 1008 (policy violation), not a 500 dressed up as a crash.
    assert refusal.value.code == 1008


def test_a_ticket_is_refused_the_second_time(client, user):
    ticket = create_ws_ticket(user.id)

    with _connect(client, "conversation", ticket) as ws:
        assert ws is not None

    with pytest.raises(WebSocketDisconnect) as refusal:
        with _connect(client, "conversation", ticket):
            pass

    assert refusal.value.code == 1008


def test_a_valid_ticket_opens_the_socket(client, user):
    with _connect(client, "conversation", create_ws_ticket(user.id)) as ws:
        greeting = ws.receive_json()
        assert greeting["type"] == "connected"
        # Scoped to the user, so one tester's session_id cannot name another's.
        assert greeting["session_id"] == f"{user.id}:conversation"

        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}
