"""What a broken turn costs.

The daily allowance is refunded when a turn produces nothing, and that refund is
the right behaviour — nobody should pay for an answer they never got. But the
refund is only honest if "produced nothing" means the speech never reached
Whisper. Once it has, the seconds are billed by the provider whatever happens
next, and a client can decide when "next" fails simply by hanging up. These
tests pin the line between the two.
"""
import asyncio
import base64
from datetime import datetime

import pytest

from app.services.speech_manager import TurnFailedAfterTranscription, speech_manager
from app.websocket.manager import _MAX_AUDIO_B64_LEN, manager

SESSION_ID = "7:conversation"
USER_ID = 7
AUDIO = base64.b64encode(b"pretend this is opus").decode("utf-8")


class _FakeWebSocket:
    """Records what was sent, and can go silent partway through a turn.

    `dies_after` is the number of successful sends before the socket refuses —
    that is what a client closing its tab looks like from in here.
    """

    def __init__(self, dies_after: int | None = None):
        self.sent: list[dict] = []
        self.dies_after = dies_after

    async def send_json(self, message: dict) -> None:
        if self.dies_after is not None and len(self.sent) >= self.dies_after:
            raise RuntimeError('Cannot call "send" once a close message has been sent.')
        self.sent.append(message)


@pytest.fixture
def live_session(redis_stub):
    """A connected session, registered the way manager.connect() leaves it."""
    def _connect(websocket: _FakeWebSocket) -> str:
        manager.active_connections[SESSION_ID] = websocket
        manager.session_data[SESSION_ID] = {
            "transcriptions": [],
            "started_at": datetime.utcnow(),
            "is_processing": False,
            "user_id": USER_ID,
        }
        return SESSION_ID

    yield _connect

    manager.active_connections.pop(SESSION_ID, None)
    manager.session_data.pop(SESSION_ID, None)


def _successful_turn(spoken_seconds: float):
    async def _turn(**_kwargs):
        return "مرحبا", "أهلا بك", "", b"mp3-bytes", spoken_seconds
    return _turn


# --- The speech pipeline ------------------------------------------------------

def test_a_failure_after_stt_carries_the_duration_out(monkeypatch):
    async def transcribed(*_args, **_kwargs):
        return "مرحبا", 12.5

    async def llm_is_down(*_args, **_kwargs):
        raise RuntimeError("LLM unavailable")

    monkeypatch.setattr(speech_manager, "transcribe_audio", transcribed)
    monkeypatch.setattr(speech_manager, "generate_response", llm_is_down)

    with pytest.raises(TurnFailedAfterTranscription) as failure:
        asyncio.run(speech_manager.process_conversation_turn(b"audio", []))

    assert failure.value.spoken_seconds == 12.5


def test_a_failure_before_stt_carries_nothing(monkeypatch):
    async def stt_is_down(*_args, **_kwargs):
        raise RuntimeError("Whisper unavailable")

    monkeypatch.setattr(speech_manager, "transcribe_audio", stt_is_down)

    # Not a TurnFailedAfterTranscription: nothing was transcribed, nothing owed.
    with pytest.raises(RuntimeError):
        asyncio.run(speech_manager.process_conversation_turn(b"audio", []))


# --- What the WebSocket layer reports back ------------------------------------

def test_a_completed_turn_reports_what_was_spoken(live_session, monkeypatch):
    session_id = live_session(_FakeWebSocket())
    monkeypatch.setattr(speech_manager, "process_conversation_turn", _successful_turn(9.0))

    spoken = asyncio.run(manager.handle_audio_chunk(session_id, AUDIO))

    assert spoken == 9.0


def test_a_turn_that_broke_after_stt_is_still_billed(live_session, monkeypatch):
    session_id = live_session(_FakeWebSocket())

    async def fails_late(**_kwargs):
        raise TurnFailedAfterTranscription(31.0, RuntimeError("TTS unavailable"))

    monkeypatch.setattr(speech_manager, "process_conversation_turn", fails_late)

    spoken = asyncio.run(manager.handle_audio_chunk(session_id, AUDIO))

    # Not None: Whisper ran and charged us for those 31 seconds.
    assert spoken == 31.0


def test_hanging_up_mid_turn_does_not_make_the_speech_free(live_session, monkeypatch):
    """The abuse path: send audio, close the socket before the reply arrives.

    The turn itself succeeds — it is the delivery that fails — so every send
    after "processing" raises. Refunding here would let anyone replay Whisper
    for free, quota untouched.
    """
    websocket = _FakeWebSocket(dies_after=1)  # only "processing" gets through
    session_id = live_session(websocket)
    monkeypatch.setattr(speech_manager, "process_conversation_turn", _successful_turn(47.0))

    spoken = asyncio.run(manager.handle_audio_chunk(session_id, AUDIO))

    assert spoken == 47.0
    assert [m["type"] for m in websocket.sent] == ["processing"]


def test_a_dead_socket_does_not_swallow_the_duration(live_session, monkeypatch):
    """Both the turn and the error notification fail. The duration must survive
    the second failure — it is the only thing here the user owes."""
    websocket = _FakeWebSocket(dies_after=1)
    session_id = live_session(websocket)

    async def fails_late(**_kwargs):
        raise TurnFailedAfterTranscription(18.0, RuntimeError("TTS unavailable"))

    monkeypatch.setattr(speech_manager, "process_conversation_turn", fails_late)

    spoken = asyncio.run(manager.handle_audio_chunk(session_id, AUDIO))

    assert spoken == 18.0


# --- Turns that really did produce nothing ------------------------------------

def test_an_oversized_chunk_costs_nothing(live_session, monkeypatch):
    session_id = live_session(_FakeWebSocket())

    async def never_called(**_kwargs):
        raise AssertionError("the chunk should have been refused before any provider call")

    monkeypatch.setattr(speech_manager, "process_conversation_turn", never_called)

    spoken = asyncio.run(manager.handle_audio_chunk(session_id, "A" * (_MAX_AUDIO_B64_LEN + 1)))

    assert spoken is None


def test_a_busy_session_costs_nothing(live_session, monkeypatch):
    session_id = live_session(_FakeWebSocket())
    manager.session_data[session_id]["is_processing"] = True

    async def never_called(**_kwargs):
        raise AssertionError("a second turn should not start while one is running")

    monkeypatch.setattr(speech_manager, "process_conversation_turn", never_called)

    spoken = asyncio.run(manager.handle_audio_chunk(session_id, AUDIO))

    assert spoken is None


def test_a_turn_that_never_reached_whisper_costs_nothing(live_session, monkeypatch):
    session_id = live_session(_FakeWebSocket())

    async def stt_is_down(**_kwargs):
        raise RuntimeError("Whisper unavailable")

    monkeypatch.setattr(speech_manager, "process_conversation_turn", stt_is_down)

    spoken = asyncio.run(manager.handle_audio_chunk(session_id, AUDIO))

    assert spoken is None
