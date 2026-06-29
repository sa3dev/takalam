import redis
from app.config.settings import settings

# Shared singleton — reused by rate_limit, security, and websocket manager
client = redis.from_url(settings.REDIS_URL, decode_responses=True)
