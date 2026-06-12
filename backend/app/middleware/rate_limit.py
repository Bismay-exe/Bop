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


# ─── Daily stream quota (PRD §20 — QUOTA_EXCEEDED) ──────────────────────────
# key -> (day_epoch, count)
_daily: dict[str, tuple[int, int]] = {}


def enforce_stream_quota(user_id: str | None, ip: str) -> None:
    """Per-user (or per-IP if anon) daily cap on stream extractions."""
    limit = settings.STREAM_DAILY_QUOTA
    if limit <= 0:
        return
    key = f"quota:{user_id or ip}"
    day = int(time.time() // 86400)
    cur_day, count = _daily.get(key, (day, 0))
    if cur_day != day:
        _daily[key] = (day, 1)
        return
    if count >= limit:
        raise APIError("QUOTA_EXCEEDED", "Daily stream quota reached", 429)
    _daily[key] = (day, count + 1)


# ─── Generic per-IP route limiting (PRD §20) ────────────────────────────────
# Path-prefix -> requests/min per IP. Stream handled separately (tiered).
_PREFIX_LIMITS: list[tuple[str, int]] = [
    ("/api/v1/search", settings.SEARCH_RATE_LIMIT_PER_MINUTE),
    ("/api/v1/explore", 60),
    ("/api/v1/recommendations", 60),
    ("/api/v1/auth/sync", 5),
    ("/api/v1/library", 120),
    ("/api/v1/playlist", 60),
]


def enforce_path_limit(request: Request) -> None:
    path = request.url.path
    for prefix, limit in _PREFIX_LIMITS:
        if path.startswith(prefix):
            ip = request.client.host if request.client else "unknown"
            if not _hit(f"path:{prefix}:{ip}", limit):
                raise APIError("RATE_LIMITED", "Too many requests, slow down", 429)
            return


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
