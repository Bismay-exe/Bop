"""/lyrics (PRD §14) — cached 24h."""
from __future__ import annotations

from fastapi import APIRouter, Request

from app.services import ytmusic_service
from app.utils.cache import cached, lyrics_cache
from app.utils.errors import success

router = APIRouter(prefix="/lyrics", tags=["lyrics"])


@router.get("/{video_id}")
async def lyrics(request: Request, video_id: str):
    data, _hit = await cached(lyrics_cache, f"lyrics:{video_id}", lambda: ytmusic_service.get_lyrics(video_id))
    return success(data)
