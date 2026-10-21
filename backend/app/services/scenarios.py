"""Role-play situations the learner can practise.

A scenario is data: who the assistant plays, what the learner is trying to do,
and the first line the assistant says. The titles and goals the learner reads
live in the frontend translations, keyed by `id`; what lives here is what the
model needs.

Modern Standard Arabic only, for now. Opening lines are fixed, which makes them
instant (no model call) and cacheable (the same clip every time).
"""
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Scenario:
    id: str
    level: str  # "beginner" | "intermediate"
    role: str  # who the assistant plays, and where
    goal: str  # what the learner is trying to accomplish
    opening: str  # first line, fully vowelled


SCENARIOS: tuple[Scenario, ...] = (
    Scenario(
        id="restaurant",
        level="beginner",
        role="a friendly waiter in an Arabic restaurant",
        goal="order a main dish and a drink, then ask for the bill",
        opening="أَهْلًا وَسَهْلًا بِكَ فِي مَطْعَمِنَا! تَفَضَّلْ بِالْجُلُوسِ. مَاذَا تُحِبُّ أَنْ تَطْلُبَ؟",
    ),
    Scenario(
        id="taxi",
        level="beginner",
        role="a taxi driver who has just picked the learner up",
        goal="say where they want to go, ask roughly how long it takes and how much it costs",
        opening="مَرْحَبًا! تَفَضَّلْ بِالرُّكُوبِ. إِلَى أَيْنَ تُرِيدُ أَنْ تَذْهَبَ؟",
    ),
    Scenario(
        id="introduce",
        level="beginner",
        role="Sami, a friendly new neighbour meeting the learner for the first time",
        goal="introduce themselves: name, where they come from, what they do, why they are learning Arabic",
        opening="مَرْحَبًا! أَظُنُّ أَنَّنَا جَارَانِ جَدِيدَانِ. أَنَا سَامِي، وَمَا اسْمُكَ؟",
    ),
    Scenario(
        id="hotel",
        level="beginner",
        role="a polite receptionist at a hotel front desk",
        goal="check in, ask about breakfast hours and the wifi, and ask for something for the room",
        opening="مَرْحَبًا بِكَ فِي فُنْدُقِنَا! هَلْ لَدَيْكَ حَجْزٌ بِاسْمِكَ؟",
    ),
    Scenario(
        id="market",
        level="intermediate",
        role="a cheerful stallholder selling fruit and vegetables at a market",
        goal="ask the price of two or three items, bargain politely, and buy",
        opening="السَّلَامُ عَلَيْكُمْ! تَفَضَّلْ، عِنْدِي أَجْوَدُ الْفَوَاكِهِ وَالْخُضَارِ. مَاذَا تُرِيدُ الْيَوْمَ؟",
    ),
    Scenario(
        id="family",
        level="intermediate",
        role="the warm, talkative mother of a friend, welcoming the learner to the family home for dinner",
        goal="greet the family politely, compliment the food, answer questions about themselves, and thank the host",
        opening="أَهْلًا بِكَ فِي بَيْتِنَا! تَفَضَّلْ، اِجْلِسْ وَاشْرَبْ كُوبًا مِنَ الشَّايِ. كَيْفَ حَالُكَ؟",
    ),
)

_BY_ID = {scenario.id: scenario for scenario in SCENARIOS}


def get_scenario(scenario_id: Optional[str]) -> Optional[Scenario]:
    """None for anything unknown: a stale or forged id means free conversation."""
    if not isinstance(scenario_id, str):
        return None
    return _BY_ID.get(scenario_id)


def scenario_prompt(scenario: Scenario) -> str:
    """The role-play block appended to the assistant's standing rules."""
    pace = (
        "Use very short, simple sentences and common words. Speak as you would to a beginner."
        if scenario.level == "beginner"
        else "Use natural but clear sentences. The learner can handle a little more."
    )
    return f"""

## Current situation (role-play)

This conversation is a role-play for practising Arabic. Role-play inside this situation is part of the Arabic practice and is allowed; every strict rule above still applies.

- You play: {scenario.role}.
- The learner is trying to: {scenario.goal}.
- Reply only in Modern Standard Arabic (fusha), fully vowelled, in plain text.
- Stay in character. Keep each reply to one or two short sentences, then let the learner speak.
- {pace}
- Never correct the learner directly. If you did not understand, answer naturally as your character would: rephrase, ask them to repeat, or suggest the word gently inside the sentence.
- Move the situation forward step by step toward the learner's goal. When the goal is reached, close the scene warmly in one sentence."""
