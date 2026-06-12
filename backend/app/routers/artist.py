"""/artist (PRD §12)."""
from __future__ import annotations

from fastapi import APIRouter, Query, Request

from app.services import ytmusic_service
from app.utils.cache import artist_cache, cached
from app.utils.errors import success

router = APIRouter(prefix="/artist", tags=["artist"])


@router.get("/{artist_id}")
async def artist(request: Request, artist_id: str):
    data, _hit = await cached(artist_cache, f"artist:{artist_id}", lambda: ytmusic_service.get_artist(artist_id))
    return success(data)


@router.get("/{artist_id}/songs")
async def artist_songs(
    request: Request,
    artist_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    data, _hit = await cached(artist_cache, f"artist:{artist_id}", lambda: ytmusic_service.get_artist(artist_id))
    songs = data.get("topSongs", [])[offset : offset + limit]
    return success({"artistId": artist_id, "results": songs})


@router.get("/{artist_id}/albums")
async def artist_albums(request: Request, artist_id: str):
    data, _hit = await cached(artist_cache, f"artist:{artist_id}", lambda: ytmusic_service.get_artist(artist_id))
    return success({
        "artistId": artist_id,
        "albums": data.get("albums", []),
        "singles": data.get("singles", []),
    })
