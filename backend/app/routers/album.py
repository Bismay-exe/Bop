"""/album (PRD §13)."""
from __future__ import annotations

from fastapi import APIRouter, Request

from app.services import ytmusic_service
from app.utils.cache import album_cache, cached
from app.utils.errors import success

router = APIRouter(prefix="/album", tags=["album"])


@router.get("/{browse_id}")
async def album(request: Request, browse_id: str):
    data, _hit = await cached(album_cache, f"album:{browse_id}", lambda: ytmusic_service.get_album(browse_id))
    return success(data)
