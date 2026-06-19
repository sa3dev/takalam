import json
from typing import List, Dict
from groq import AsyncGroq
from app.config.settings import settings
from app.schemas.session import ShadowFeedback, GrammarCorrection


class ShadowFeedbackAnalyzer:
    """
    Analyzes user speech sessions in the background without interrupting the flow.
    Extracts grammar corrections, vocabulary, fluency, and confidence metrics.
    """

    ANALYSIS_PROMPT = """Tu es un analyseur pédagogique pour l'apprentissage de l'arabe.

Analyse la transcription suivante d'une conversation en arabe et retourne un JSON avec ces champs exacts :

{
  "grammar_corrections": [
    {
      "input": "phrase incorrecte de l'utilisateur",
      "output": "version corrigée",
      "explanation": "explication courte de la correction"
    }
  ],
  "vocabulary_new": ["mot1", "mot2"],
  "fluency_score": 75,
  "confidence_level": 60
}

Critères :
- grammar_corrections : Seulement les erreurs grammaticales réelles (pas de corrections stylistiques)
- vocabulary_new : Nouveaux mots utilisés par l'utilisateur (non répétés)
- fluency_score (0-100) : Basé sur la longueur des phrases et la cohérence
- confidence_level (0-100) : Basé sur les hésitations, répétitions, mots de remplissage

Transcription à analyser :"""

    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def analyze_session(self, transcriptions: List[Dict[str, str]]) -> ShadowFeedback:
        formatted_text = self._format_transcriptions(transcriptions)
        analysis_json = await self._call_analysis_api(formatted_text)
        return self._parse_analysis(analysis_json)

    def _format_transcriptions(self, transcriptions: List[Dict[str, str]]) -> str:
        lines = []
        for t in transcriptions:
            speaker = "المستخدم" if t["speaker"] == "user" else "المساعد"
            lines.append(f"{speaker}: {t['text']}")
        return "\n".join(lines)

    async def _call_analysis_api(self, transcription_text: str) -> str:
        try:
            response = await self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": self.ANALYSIS_PROMPT},
                    {"role": "user", "content": transcription_text},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error calling analysis API: {e}")
            return self._empty_analysis()

    def _parse_analysis(self, analysis_json: str) -> ShadowFeedback:
        try:
            data = json.loads(analysis_json)
            corrections = [
                GrammarCorrection(**c) for c in data.get("grammar_corrections", [])
            ]
            return ShadowFeedback(
                grammar_corrections=corrections,
                vocabulary_new=data.get("vocabulary_new", []),
                fluency_score=data.get("fluency_score"),
                confidence_level=data.get("confidence_level"),
            )
        except Exception as e:
            print(f"Error parsing analysis: {e}")
            return ShadowFeedback()

    def _empty_analysis(self) -> str:
        return json.dumps({
            "grammar_corrections": [],
            "vocabulary_new": [],
            "fluency_score": None,
            "confidence_level": None,
        })

    def calculate_additional_metrics(self, transcriptions: List[Dict[str, str]]) -> Dict:
        user_transcriptions = [t for t in transcriptions if t["speaker"] == "user"]
        total_words = sum(len(t["text"].split()) for t in user_transcriptions)
        return {
            "total_words_spoken": total_words,
            "average_response_time": None,
        }
