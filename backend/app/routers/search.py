"""/search — tab-based lazy loading (PRD §8)."""
from __future__ import annotations

from fastapi import APIRouter, Query, Request

from app.services import ytmusic_service
from app.utils.cache import cached, search_cache, search_top_cache
from app.utils.errors import success

router = APIRouter(prefix="/search", tags=["search"])

_VALID_TYPES = {"top", "songs", "artists", "albums", "playlists", "videos"}


@router.get("")
async def search(
    request: Request,
    q: str = Query(..., min_length=1),
    type: str = Query("top"),
    limit: int = Query(20, ge=1, le=50),
):
    search_type = type if type in _VALID_TYPES else "top"
    cache = search_top_cache if search_type == "top" else search_cache
    key = f"{search_type}:{limit}:{q.lower().strip()}"

    data, _hit = await cached(
        cache, key, lambda: ytmusic_service.search(q, search_type, limit)
    )
    return success(data)


@router.get("/suggestions")
async def suggestions(request: Request, q: str = Query(..., min_length=1)):
    data = await ytmusic_service.search_suggestions(q)
    return success(data)
