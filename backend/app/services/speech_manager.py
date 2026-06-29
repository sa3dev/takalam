import logging
from abc import ABC, abstractmethod
from typing import Optional
import io
import edge_tts
from groq import AsyncGroq
from app.config.settings import settings

logger = logging.getLogger(__name__)


class STTProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_data: bytes, language: str = "ar") -> str:
        pass


class LLMProvider(ABC):
    @abstractmethod
    async def generate_response(self, messages: list, system_prompt: str) -> str:
        pass


class TTSProvider(ABC):
    @abstractmethod
    async def synthesize(self, text: str, voice: Optional[str] = None) -> bytes:
        pass


class GroqSTT(STTProvider):
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def transcribe(self, audio_data: bytes, language: str = "ar") -> str:
        audio_file = io.BytesIO(audio_data)
        audio_file.name = "audio.webm"
        response = await self.client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_file,
            language=language,
            response_format="text",
        )
        return response


class GroqLLM(LLMProvider):
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def generate_response(self, messages: list, system_prompt: str) -> str:
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        response = await self.client.chat.completions.create(
            model=settings.DEFAULT_LLM_MODEL,
            messages=full_messages,
            temperature=0.7,
            max_tokens=500,
        )
        return response.choices[0].message.content


class EdgeTTS(TTSProvider):
    """Microsoft Edge TTS — gratuit, aucune clé API requise, voix arabes naturelles."""

    async def synthesize(self, text: str, voice: Optional[str] = None) -> bytes:
        selected_voice = voice or settings.EDGE_TTS_VOICE
        communicate = edge_tts.Communicate(text, selected_voice)
        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        return b"".join(chunks)


class SpeechManager:
    SYSTEM_PROMPT = """أنت صديق صبور اسمه تكلم (Takalam). هدفك هو تشجيع المستخدم على التحدث بالعربية.

لا تقاطع المستخدم بتصحيحات مباشرة. بدلاً من ذلك، استمر في المحادثة بشكل طبيعي وودود.
استخدم ردود بسيطة ومشجعة تساعد المستخدم على الاستمرار في التحدث دون خوف من الحكم.

أنت مستمع متعاطف وداعم، وليس معلماً صارماً.

تعليمة مهمة: اكتب جميع ردودك بالتشكيل الكامل (فَتْحة، كَسْرة، ضَمَّة، سُكُون، شَدَّة) لمساعدة المتعلم على النطق الصحيح."""

    def __init__(self):
        self.stt = GroqSTT()
        self.llm = GroqLLM()
        self.tts: TTSProvider = EdgeTTS()

    async def transcribe_audio(self, audio_data: bytes, language: str = "ar") -> str:
        return await self.stt.transcribe(audio_data, language)

    async def generate_response(self, conversation_history: list) -> str:
        return await self.llm.generate_response(conversation_history, self.SYSTEM_PROMPT)

    async def synthesize_speech(self, text: str, voice: Optional[str] = None) -> bytes:
        return await self.tts.synthesize(text, voice)

    async def process_conversation_turn(
        self,
        audio_data: bytes,
        conversation_history: list,
        language: str = "ar",
    ) -> tuple[str, str, bytes]:
        import time
        t0 = time.perf_counter()

        user_text = await self.transcribe_audio(audio_data, language)
        t1 = time.perf_counter()

        conversation_history.append({"role": "user", "content": user_text})
        ai_response = await self.generate_response(conversation_history)
        t2 = time.perf_counter()

        conversation_history.append({"role": "assistant", "content": ai_response})
        ai_audio = await self.synthesize_speech(ai_response)
        t3 = time.perf_counter()

        logger.info(
            "latency — STT: %.2fs | LLM: %.2fs | TTS: %.2fs | total: %.2fs",
            t1 - t0, t2 - t1, t3 - t2, t3 - t0,
        )
        return user_text, ai_response, ai_audio


# Module-level singleton — one instance shared across all WebSocket connections
speech_manager = SpeechManager()
