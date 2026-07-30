from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Takalam API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"

    # Groq — required (LLM + STT)
    GROQ_API_KEY: str
    # OpenAI — optionnel (non utilisé par défaut, Edge TTS est gratuit)
    OPENAI_API_KEY: Optional[str] = None
    ELEVENLABS_API_KEY: Optional[str] = None

    # Voix Edge TTS — voir liste : edge-tts --list-voices | grep ar
    EDGE_TTS_VOICE: str = "ar-SA-HamedNeural"  # voix arabe féminine (naturelle)

    # No defaults — must be set via env vars
    SECRET_KEY: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # AI config — Groq defaults
    DEFAULT_STT_PROVIDER: str = "groq"
    DEFAULT_LLM_MODEL: str = "llama-3.3-70b-versatile"
    DEFAULT_TTS_PROVIDER: str = "openai"

    # Comma-separated allowed origins for CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://frontend:3000"

    # Number of trusted reverse proxies that append X-Forwarded-For between the
    # client and this backend. In this stack the Next.js proxy is always present
    # (=1); add +1 for each extra edge proxy (nginx, load balancer, …). Used to
    # extract the real client IP for rate limiting without trusting spoofed
    # client-supplied X-Forwarded-For entries. Set 0 to disable XFF trust.
    TRUSTED_PROXY_COUNT: int = 1

    # --- Freemium ------------------------------------------------------------
    # The free plan is metered in *spoken* seconds (the audio duration Whisper
    # reports), not wall-clock session time: a learner who hesitates before
    # speaking must not burn their daily allowance for it — hesitation is
    # exactly the behaviour this product exists to make safe.
    # Tunable via env so the wall can be moved without a code deploy.
    FREE_DAILY_SPOKEN_SECONDS: int = 600  # 10 minutes/day, resets at UTC midnight

    # Displayed on the paywall. No billing integration yet — these are the
    # prices we are measuring intent against.
    PRO_PRICE_MONTHLY_EUR: float = 12.99
    PRO_PRICE_ANNUAL_EUR: float = 129.0

    AUDIO_SAMPLE_RATE: int = 16000
    AUDIO_CHUNK_SIZE: int = 1024
    WS_HEARTBEAT_INTERVAL: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
