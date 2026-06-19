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
    # OpenAI — optional (TTS only)
    OPENAI_API_KEY: Optional[str] = None
    ELEVENLABS_API_KEY: Optional[str] = None

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

    AUDIO_SAMPLE_RATE: int = 16000
    AUDIO_CHUNK_SIZE: int = 1024
    WS_HEARTBEAT_INTERVAL: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
