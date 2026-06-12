"""/library — liked songs + listening history (PRD §15). All require auth."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.services import supabase_service
from app.utils.errors import success

router = APIRouter(prefix="/library", tags=["library"])


class LikeBody(BaseModel):
    title: str
    artist: str
    thumbnail_url: str | None = None
    duration_seconds: int | None = None


class HistoryBody(BaseModel):
    video_id: str
    title: str
    artist: str
    thumbnail_url: str | None = None
    play_duration_seconds: int | None = 0


# ─── Liked ──────────────────────────────────────────────────────────────────
@router.get("/liked")
async def get_liked(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    rows = await supabase_service.list_liked(user["id"], limit, offset)
    return success({"results": rows, "limit": limit, "offset": offset})


@router.post("/liked/{video_id}")
async def like_song(
    request: Request,
    video_id: str,
    body: LikeBody,
    user: dict = Depends(get_current_user),
):
    row = await supabase_service.add_liked(user["id"], video_id, body.model_dump())
    return success(row)


@router.delete("/liked/{video_id}")
async def unlike_song(request: Request, video_id: str, user: dict = Depends(get_current_user)):
    await supabase_service.remove_liked(user["id"], video_id)
    return success({"video_id": video_id, "liked": False})


@router.get("/liked/{video_id}/status")
async def liked_status(request: Request, video_id: str, user: dict = Depends(get_current_user)):
    liked = await supabase_service.is_liked(user["id"], video_id)
    return success({"liked": liked})


# ─── History ────────────────────────────────────────────────────────────────
@router.get("/history")
async def get_history(
    request: Request,
    limit: int = Query(30, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    rows = await supabase_service.list_history(user["id"], limit, offset)
    return success({"results": rows, "limit": limit, "offset": offset})


@router.post("/history")
async def record_history(request: Request, body: HistoryBody, user: dict = Depends(get_current_user)):
    row = await supabase_service.add_history(user["id"], body.model_dump())
    return success(row)


@router.delete("/history")
async def clear_history(request: Request, user: dict = Depends(get_current_user)):
    await supabase_service.clear_history(user["id"])
    return success({"cleared": True})
