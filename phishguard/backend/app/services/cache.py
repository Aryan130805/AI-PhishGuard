import redis
import json
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger("phishguard")

# Simple in-memory fallback cache dictionary
IN_MEMORY_CACHE = {}

class CacheService:
    def __init__(self):
        self.redis_client = None
        try:
            # Connect to Redis using broker URL
            self.redis_client = redis.Redis.from_url(
                settings.CELERY_BROKER_URL,
                socket_connect_timeout=2.0
            )
            # Ping to verify connection
            self.redis_client.ping()
        except Exception:
            logger.warning("Redis is not available. Falling back to in-memory cache.")
            self.redis_client = None

    def get(self, key: str) -> Optional[dict]:
        if self.redis_client:
            try:
                data = self.redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception as e:
                logger.error(f"Redis get error: {str(e)}")
        
        # Fallback to In-Memory
        return IN_MEMORY_CACHE.get(key)

    def set(self, key: str, value: dict, expire_seconds: int = 86400) -> None:
        if self.redis_client:
            try:
                self.redis_client.setex(key, expire_seconds, json.dumps(value))
                return
            except Exception as e:
                logger.error(f"Redis setex error: {str(e)}")
                
        # Fallback to In-Memory
        IN_MEMORY_CACHE[key] = value

    @staticmethod
    def make_key(department_id: Optional[int], difficulty: str, theme: str, language: str) -> str:
        dept = str(department_id) if department_id is not None else "global"
        # Standardize strings to prevent mismatch due to spacing
        return f"ai_gen:{dept}:{difficulty.strip().lower()}:{theme.strip().lower()}:{language.strip().lower()}"
