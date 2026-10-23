import asyncio

from app.services.scenarios import SCENARIOS, get_scenario, scenario_prompt
from app.services.speech_manager import speech_manager
from app.websocket.manager import manager


def test_every_scenario_is_complete_and_unique():
    ids = [s.id for s in SCENARIOS]
    assert len(ids) == len(set(ids)) == 6
    for s in SCENARIOS:
        assert s.level in ("beginner", "intermediate")
        assert s.role and s.goal and s.opening


def test_unknown_or_forged_ids_mean_free_conversation():
    assert get_scenario(None) is None
    assert get_scenario("nope") is None
    assert get_scenario({"id": "restaurant"}) is None
    assert get_scenario("restaurant").id == "restaurant"


def test_the_standing_rules_still_lead_when_a_situation_is_set():
    free = speech_manager.system_prompt(None)
    set_up = speech_manager.system_prompt("restaurant")
    assert set_up.startswith(free)
    assert "waiter" in set_up and "every strict rule above still applies" in set_up
    assert speech_manager.system_prompt("unknown") == free


def test_the_beginner_pace_differs_from_the_intermediate_one():
    beginner = scenario_prompt(get_scenario("restaurant"))
    intermediate = scenario_prompt(get_scenario("market"))
    assert "very short, simple sentences" in beginner
    assert "very short, simple sentences" not in intermediate


class _Socket:
    def __init__(self):
        self.sent = []

    async def send_json(self, message):
        self.sent.append(message)


def _open(redis_stub, monkeypatch, history=None):
    sid = "7:test"
    socket = _Socket()
    manager.active_connections[sid] = socket
    manager.session_data[sid] = {"transcriptions": [], "is_processing": False, "user_id": 7}
    if history:
        manager._save_history(sid, history)

    async def voice(scenario):
        return b"mp3"

    async def translate(text, lang):
        return "Welcome"

    monkeypatch.setattr(speech_manager, "synthesize_opening", voice)
    monkeypatch.setattr(speech_manager, "translate", translate)
    try:
        asyncio.run(manager.open_scenario(sid, "restaurant", "en"))
    finally:
        manager.active_connections.pop(sid, None)
    state = manager.session_data.pop(sid)
    return socket.sent, state


def test_the_assistant_speaks_first_with_text_translation_and_voice(redis_stub, monkeypatch):
    sent, state = _open(redis_stub, monkeypatch)
    assert [m["type"] for m in sent] == ["transcription", "audio_response"]
    assert sent[0]["speaker"] == "assistant" and sent[0]["translation"] == "Welcome"
    assert state["transcriptions"][0]["speaker"] == "assistant"


def test_a_conversation_already_underway_is_not_reopened(redis_stub, monkeypatch):
    sent, _ = _open(redis_stub, monkeypatch, history=[{"role": "user", "content": "x"}])
    assert sent == []
