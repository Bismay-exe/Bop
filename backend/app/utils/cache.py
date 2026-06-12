"""In-memory TTL caches (PRD §19).

P5 note: TTLCache is MVP-only — in-memory, single-instance, wiped on restart.
The Redis seam is intentionally NOT built here. When scaling, swap `cached()`'s
backing store; call sites stay unchanged.

There is deliberately NO stream cache — stream URLs expire ~6h and must always
be fetched fresh (PRD §9/§19).
"""
from __future__ import annotations

from typing import Any, Awaitable, Callable, TypeVar

from cachetools import TTLCache

# Per-surface caches (maxsize, ttl seconds) — values straight from PRD §19.
search_cache: TTLCache = TTLCache(maxsize=500, ttl=300)      # 5 min
search_top_cache: TTLCache = TTLCache(maxsize=500, ttl=120)  # 2 min
charts_cache: TTLCache = TTLCache(maxsize=50, ttl=3600)      # 1 hour
artist_cache: TTLCache = TTLCache(maxsize=200, ttl=1800)     # 30 min
album_cache: TTLCache = TTLCache(maxsize=200, ttl=3600)      # 1 hour
lyrics_cache: TTLCache = TTLCache(maxsize=1000, ttl=86400)   # 24 hours
home_cache: TTLCache = TTLCache(maxsize=20, ttl=900)         # 15 min
radio_cache: TTLCache = TTLCache(maxsize=300, ttl=600)       # 10 min

T = TypeVar("T")


async def cached(
    cache: TTLCache,
    key: str,
    producer: Callable[[], Awaitable[T]],
) -> tuple[T, bool]:
    """Return (value, cache_hit). `producer` is awaited only on a miss."""
    if key in cache:
        return cache[key], True
    value = await producer()
    cache[key] = value
    return value, False


def cache_set(cache: TTLCache, key: str, value: Any) -> None:
    cache[key] = value
