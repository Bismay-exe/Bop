"""/stream/{video_id} — real-time yt-dlp extraction (PRD §9).

Phase 2: still OPEN (no auth required) so previews work, but now:
  • optional auth identifies the user (higher rate limit when logged in)
  • tiered rate limiting (per-user 30/min, per-IP fallback) is enforced

Never cached — always a fresh URL.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from app.dependencies import get_optional_user
from app.middleware.rate_limit import enforce_stream_limit
from app.services import stream_service
from app.utils.errors import success

router = APIRouter(prefix="/stream", tags=["stream"])


@router.get("/{video_id}")
async def get_stream(
    request: Request,
    video_id: str,
    quality: str = Query("high"),
    format: str = Query("m4a"),
    user: Optional[dict] = Depends(get_optional_user),
):
    user_id = user["id"] if user else None
    request.state.auth_user_id = user_id
    enforce_stream_limit(request, user_id)

    data = await stream_service.extract_stream(video_id)
    return success(data)
