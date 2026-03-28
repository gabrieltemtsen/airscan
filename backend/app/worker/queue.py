from __future__ import annotations

from app.core.config import settings


def get_redis():
    if not settings.redis_url:
        return None
    from redis import Redis
    return Redis.from_url(settings.redis_url)


def get_queue(name: str = "airscan"):
    """Return RQ Queue if Redis is configured, else None (fallback to threading)."""
    r = get_redis()
    if r is None:
        return None
    try:
        from rq import Queue
        return Queue(name, connection=r)
    except Exception:
        return None
