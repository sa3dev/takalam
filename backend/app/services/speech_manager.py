from abc import ABC, abstractmethod
from typing import Optional, AsyncIterator
import base64
import io
from openai import AsyncOpenAI
from groq import AsyncGroq
# from elevenlabs.client import AsyncElevenLabs  # TODO: Fix ElevenLabs import
from app.config.settings import settings


# Abstract Base Classes for Providers
class STTProvider(ABC):
    """Abstract Speech-to-Text provider."""

    @abstractmethod
    async def transcribe(self, audio_data: bytes, language: str = "ar") -> str:
        """Transcribe audio to text."""
        pass


class LLMProvider(ABC):
    """Abstract LLM provider."""

    @abstractmethod
    async def generate_response(self, messages: list, system_prompt: str) -> str:
        """Generate conversational response."""
        pass


class TTSProvider(ABC):
    """Abstract Text-to-Speech provider."""

    @abstractmethod
    async def synthesize(self, text: str, voice: Optional[str] = None) -> bytes:
        """Synthesize text to speech."""
        pass


# OpenAI Implementations
class OpenAISTT(STTProvider):
    """OpenAI Whisper STT implementation."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def transcribe(self, audio_data: bytes, language: str = "ar") -> str:
        """Transcribe audio using OpenAI Whisper."""
        audio_file = io.BytesIO(audio_data)
        audio_file.name = "audio.webm"

        response = await self.client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=language,
            response_format="text"
        )
        return response


class OpenAILLM(LLMProvider):
    """OpenAI GPT-4o LLM implementation."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate_response(self, messages: list, system_prompt: str) -> str:
        """Generate response using GPT-4o."""
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        response = await self.client.chat.completions.create(
            model=settings.DEFAULT_LLM_MODEL,
            messages=full_messages,
            temperature=0.7,
            max_tokens=500
        )
        return response.choices[0].message.content


class OpenAITTS(TTSProvider):
    """OpenAI TTS implementation."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def synthesize(self, text: str, voice: Optional[str] = "nova") -> bytes:
        """Synthesize speech using OpenAI TTS."""
        response = await self.client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            response_format="mp3"
        )
        return response.content


# Groq Implementation
class GroqSTT(STTProvider):
    """Groq Whisper STT implementation (faster alternative)."""

    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def transcribe(self, audio_data: bytes, language: str = "ar") -> str:
        """Transcribe audio using Groq Whisper."""
        audio_file = io.BytesIO(audio_data)
        audio_file.name = "audio.webm"

        response = await self.client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_file,
            language=language,
            response_format="text"
        )
        return response


# ElevenLabs Implementation (disabled temporarily)
# class ElevenLabsTTS(TTSProvider):
#     """ElevenLabs TTS implementation."""
#
#     def __init__(self):
#         self.client = AsyncElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
#
#     async def synthesize(self, text: str, voice: Optional[str] = None) -> bytes:
#         """Synthesize speech using ElevenLabs."""
#         voice_id = voice or "21m00Tcm4TlvDq8ikWAM"  # Default voice
#
#         response = await self.client.text_to_speech.convert(
#             voice_id=voice_id,
#             text=text,
#             model_id="eleven_multilingual_v2"
#         )
#
#         # Collect streaming response
#         audio_chunks = []
#         async for chunk in response:
#             audio_chunks.append(chunk)
#
#         return b"".join(audio_chunks)


# Main SpeechManager Class
class SpeechManager:
    """
    Modular Speech Manager with pluggable providers.
    Handles STT, LLM, and TTS orchestration.
    """

    # System prompt for the AI (as per CONTEXT.md)
    SYSTEM_PROMPT = """أنت صديق صبور اسمه تكلم (Takalam). هدفك هو تشجيع المستخدم على التحدث بالعربية.

لا تقاطع المستخدم بتصحيحات مباشرة. بدلاً من ذلك، استمر في المحادثة بشكل طبيعي وودود.
استخدم ردود بسيطة ومشجعة تساعد المستخدم على الاستمرار في التحدث دون خوف من الحكم.

أنت مستمع متعاطف وداعم، وليس معلماً صارماً."""

    def __init__(
        self,
        stt_provider: Optional[str] = None,
        llm_provider: Optional[str] = None,
        tts_provider: Optional[str] = None
    ):
        """Initialize SpeechManager with specified providers."""

        # Initialize STT
        stt_name = stt_provider or settings.DEFAULT_STT_PROVIDER
        if stt_name == "groq" and settings.GROQ_API_KEY:
            self.stt = GroqSTT()
        else:
            self.stt = OpenAISTT()

        # Initialize LLM (currently only OpenAI GPT-4o)
        self.llm = OpenAILLM()

        # Initialize TTS (ElevenLabs temporarily disabled)
        # tts_name = tts_provider or settings.DEFAULT_TTS_PROVIDER
        # if tts_name == "elevenlabs" and settings.ELEVENLABS_API_KEY:
        #     self.tts = ElevenLabsTTS()
        # else:
        self.tts = OpenAITTS()

    async def transcribe_audio(self, audio_data: bytes, language: str = "ar") -> str:
        """Transcribe audio to text."""
        return await self.stt.transcribe(audio_data, language)

    async def generate_response(self, conversation_history: list) -> str:
        """Generate AI response based on conversation history."""
        return await self.llm.generate_response(conversation_history, self.SYSTEM_PROMPT)

    async def synthesize_speech(self, text: str, voice: Optional[str] = None) -> bytes:
        """Synthesize text to speech."""
        return await self.tts.synthesize(text, voice)

    async def process_conversation_turn(
        self,
        audio_data: bytes,
        conversation_history: list,
        language: str = "ar"
    ) -> tuple[str, str, bytes]:
        """
        Process a complete conversation turn.
        Returns: (user_transcription, ai_response_text, ai_response_audio)
        """
        # Step 1: Transcribe user audio
        user_text = await self.transcribe_audio(audio_data, language)

        # Step 2: Add to conversation history
        conversation_history.append({"role": "user", "content": user_text})

        # Step 3: Generate AI response
        ai_response = await self.generate_response(conversation_history)

        # Step 4: Add AI response to history
        conversation_history.append({"role": "assistant", "content": ai_response})

        # Step 5: Synthesize AI response to audio
        ai_audio = await self.synthesize_speech(ai_response)

        return user_text, ai_response, ai_audio
