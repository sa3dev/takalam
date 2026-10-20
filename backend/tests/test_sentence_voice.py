import asyncio

from app.services.speech_manager import speech_manager, split_sentences


def test_a_reply_is_cut_at_sentence_ends():
    text = "مرحبا بك في تكلم! كيف حالك اليوم؟ أنا هنا لأساعدك في تعلم العربية."
    pieces = split_sentences(text)
    assert len(pieces) == 3
    assert pieces[0].endswith("!")


def test_fragments_too_short_to_voice_are_glued_to_a_neighbour():
    pieces = split_sentences("نعم. جيد. أهلا وسهلا بك في تكلم اليوم. شكرا")
    assert all(len(p) >= 8 for p in pieces)
    assert " ".join(pieces).count("نعم") == 1


def test_a_long_reply_never_opens_more_than_the_cap():
    text = " ".join(f"هذه هي الجملة رقم {i} في هذا الرد الطويل." for i in range(30))
    assert len(split_sentences(text)) <= 6


def test_empty_text_has_nothing_to_voice():
    assert split_sentences("") == []
    assert split_sentences("   ") == []


def _turn_with_voice(monkeypatch, synth):
    async def transcribed(*_a, **_k):
        return "مرحبا", 3.0

    async def answer(*_a, **_k):
        return "الجملة الأولى هنا موجودة. الجملة الثانية هنا موجودة. الجملة الثالثة هنا موجودة."

    monkeypatch.setattr(speech_manager, "transcribe_audio", transcribed)
    monkeypatch.setattr(speech_manager, "generate_response", answer)
    monkeypatch.setattr(speech_manager, "synthesize_speech", synth)

    received = []

    async def on_audio(index, total, audio):
        received.append((index, total, audio))

    asyncio.run(speech_manager.process_conversation_turn(b"audio", [], on_audio=on_audio))
    return received


def test_sentences_are_delivered_in_order_even_when_a_later_one_finishes_first(monkeypatch):
    async def synth(text, voice=None):
        # The first sentence is the slowest; delivery must still start with it.
        await asyncio.sleep(0.05 if "الأولى" in text else 0)
        return text.encode()

    received = _turn_with_voice(monkeypatch, synth)
    assert [i for i, _, _ in received] == [0, 1, 2]
    assert received[0][2].decode().startswith("الجملة الأولى")


def test_a_lost_middle_sentence_leaves_a_gap_not_a_failed_turn(monkeypatch):
    async def synth(text, voice=None):
        if "الثانية" in text:
            raise RuntimeError("voice unavailable")
        return text.encode()

    received = _turn_with_voice(monkeypatch, synth)
    # Numbered by what was delivered, so the client still sees 0 then 1.
    assert [i for i, _, _ in received] == [0, 1]


def test_no_more_syntheses_run_at_once_than_edge_tolerates(monkeypatch):
    running = 0
    peak = 0

    async def synth(text, voice=None):
        nonlocal running, peak
        running += 1
        peak = max(peak, running)
        await asyncio.sleep(0.02)
        running -= 1
        return text.encode()

    async def transcribed(*_a, **_k):
        return "مرحبا", 3.0

    async def answer(*_a, **_k):
        return " ".join(f"هذه هي الجملة رقم {i} في هذا الرد الطويل." for i in range(6))

    monkeypatch.setattr(speech_manager, "transcribe_audio", transcribed)
    monkeypatch.setattr(speech_manager, "generate_response", answer)
    monkeypatch.setattr(speech_manager, "synthesize_speech", synth)

    async def on_audio(*_a):
        pass

    asyncio.run(speech_manager.process_conversation_turn(b"audio", [], on_audio=on_audio))
    assert peak == 3


def test_formatting_marks_are_not_read_aloud():
    from app.services.speech_manager import clean_for_speech
    assert clean_for_speech("هذه **كلمة** مهمة") == "هذه كلمة مهمة"
    assert clean_for_speech("# عنوان\n- أولا\n- ثانيا") == "عنوان\nأولا\nثانيا"
    assert clean_for_speech("انظر [الرابط](http://x.y) الآن") == "انظر الرابط الآن"
    assert clean_for_speech("جملة عادية، بلا رموز.") == "جملة عادية، بلا رموز."
