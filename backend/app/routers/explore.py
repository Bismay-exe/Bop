"""/explore — home, trending, charts, moods, new releases (PRD §11)."""
from __future__ import annotations

from fastapi import APIRouter, Query, Request

from app.config import settings
from app.services import ytmusic_service
from app.utils.cache import cached, charts_cache, home_cache
from app.utils.errors import success

router = APIRouter(prefix="/explore", tags=["explore"])


@router.get("/home")
async def home(request: Request):
    data, _hit = await cached(home_cache, "home", lambda: ytmusic_service.get_home())
    return success(data)


@router.get("/trending")
async def trending(
    request: Request,
    country: str = Query(default=None),
    limit: int = Query(20, ge=1, le=50),
):
    c = country or settings.DEFAULT_COUNTRY
    data, _hit = await cached(charts_cache, f"trending:{c}", lambda: ytmusic_service.get_charts(c))
    # Trending = top songs slice of charts.
    songs = data.get("songs", [])[:limit]
    return success({"country": c, "songs": songs})


@router.get("/charts")
async def charts(request: Request, country: str = Query(default=None)):
    c = country or settings.DEFAULT_COUNTRY
    data, _hit = await cached(charts_cache, f"charts:{c}", lambda: ytmusic_service.get_charts(c))
    return success(data)


@router.get("/moods")
async def moods(request: Request):
    data, _hit = await cached(home_cache, "moods", lambda: ytmusic_service.get_mood_categories())
    return success(data)
