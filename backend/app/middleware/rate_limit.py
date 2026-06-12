"""Rate limiting (PRD §20) — lightweight in-memory tiered limiter.

Why not slowapi's decorator? We need TWO different limits on one endpoint
(per-user vs per-IP) and a 429 that matches our {success,data,error} envelope.
A tiny fixed-window counter gives exact control and integrates with APIError.

P5/scaling note: this is in-memory and single-instance (same stance as the
TTLCache). For multi-instance scaling this moves to Redis — the `check()`
boundary is the swap point. Not built now.
"""
from __future__ import annotations

import time
from collections import defaultdict

from starlette.requests import Request

from app.config import settings
from app.utils.errors import APIError

# key -> (window_start_epoch, count)
_buckets: dict[str, tuple[float, int]] = defaultdict(lambda: (0.0, 0))
_WINDOW = 60.0  # fixed 1-minute window


def _hit(key: str, limit: int) -> bool:
    """Return True if allowed, False if the limit is exceeded."""
    now = time.time()
    start, count = _buckets[key]
    if now - start >= _WINDOW:
        _buckets[key] = (now, 1)
        return True
    if count >= limit:
        return False
    _buckets[key] = (start, count + 1)
    return True


def enforce_stream_limit(request: Request, user_id: str | None) -> None:
    """Tiered limit for /stream (PRD §9/§20):
      • authenticated → STREAM_RATE_LIMIT_PER_MINUTE per user (default 30)
      • anonymous     → STREAM_RATE_LIMIT_IP_PER_MINUTE per IP (default 60;
                        PRD's stricter 10/min preview cap can be set via .env)
    Raises APIError(RATE_LIMITED) when exceeded.
    """
    if user_id:
        key = f"stream:user:{user_id}"
        limit = settings.STREAM_RATE_LIMIT_PER_MINUTE
    else:
        ip = request.client.host if request.client else "unknown"
        key = f"stream:ip:{ip}"
        limit = settings.STREAM_RATE_LIMIT_IP_PER_MINUTE

    if not _hit(key, limit):
        raise APIError("RATE_LIMITED", "Too many stream requests, slow down", 429)
