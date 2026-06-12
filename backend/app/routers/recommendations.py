"""/recommendations — YouTube Music's own radio/related/mix engine (PRD §10)."""
from __future__ import annotations

from fastapi import APIRouter, Request

from app.services import ytmusic_service
from app.utils.cache import cached, radio_cache
from app.utils.errors import success

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/radio/{video_id}")
async def radio(request: Request, video_id: str):
    data, _hit = await cached(radio_cache, f"radio:{video_id}", lambda: ytmusic_service.get_radio(video_id))
    return success(data)


@router.get("/related/{video_id}")
async def related(request: Request, video_id: str):
    data, _hit = await cached(radio_cache, f"related:{video_id}", lambda: ytmusic_service.get_related(video_id))
    return success(data)


@router.get("/mix/{playlist_id}")
async def mix(request: Request, playlist_id: str):
    data, _hit = await cached(radio_cache, f"mix:{playlist_id}", lambda: ytmusic_service.get_mix(playlist_id))
    return success(data)


@router.get("/artist-mix/{artist_id}")
async def artist_mix(request: Request, artist_id: str):
    data, _hit = await cached(radio_cache, f"artistmix:{artist_id}", lambda: ytmusic_service.get_artist_mix(artist_id))
    return success(data)
