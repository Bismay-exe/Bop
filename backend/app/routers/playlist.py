"""/playlist — CRUD + song management + reorder (PRD §16)."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.dependencies import get_current_user, get_optional_user
from app.services import supabase_service
from app.utils.errors import success

router = APIRouter(prefix="/playlist", tags=["playlist"])


class CreateBody(BaseModel):
    name: str
    description: str | None = None
    is_public: bool = False


class UpdateBody(BaseModel):
    name: str | None = None
    description: str | None = None
    is_public: bool | None = None


class SongBody(BaseModel):
    video_id: str
    title: str
    artist: str
    thumbnail_url: str | None = None
    duration_seconds: int | None = None


class ReorderBody(BaseModel):
    video_id: str
    new_position: int


@router.get("")
async def list_playlists(request: Request, user: dict = Depends(get_current_user)):
    rows = await supabase_service.list_playlists(user["id"])
    return success({"results": rows})


@router.post("")
async def create_playlist(request: Request, body: CreateBody, user: dict = Depends(get_current_user)):
    row = await supabase_service.create_playlist(
        user["id"], body.name, body.description, body.is_public
    )
    return success(row)


@router.get("/{playlist_id}")
async def get_playlist(
    request: Request,
    playlist_id: str,
    user: Optional[dict] = Depends(get_optional_user),
):
    # Public playlists are viewable without auth; private require ownership.
    row = await supabase_service.get_playlist(playlist_id, user["id"] if user else None)
    return success(row)


@router.patch("/{playlist_id}")
async def update_playlist(
    request: Request,
    playlist_id: str,
    body: UpdateBody,
    user: dict = Depends(get_current_user),
):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    row = await supabase_service.update_playlist(playlist_id, user["id"], fields)
    return success(row)


@router.delete("/{playlist_id}")
async def delete_playlist(request: Request, playlist_id: str, user: dict = Depends(get_current_user)):
    await supabase_service.delete_playlist(playlist_id, user["id"])
    return success({"id": playlist_id, "deleted": True})


@router.post("/{playlist_id}/songs")
async def add_song(
    request: Request,
    playlist_id: str,
    body: SongBody,
    user: dict = Depends(get_current_user),
):
    row = await supabase_service.add_playlist_song(
        playlist_id, user["id"], body.video_id, body.model_dump()
    )
    return success(row)


@router.delete("/{playlist_id}/songs/{video_id}")
async def remove_song(
    request: Request,
    playlist_id: str,
    video_id: str,
    user: dict = Depends(get_current_user),
):
    await supabase_service.remove_playlist_song(playlist_id, user["id"], video_id)
    return success({"playlist_id": playlist_id, "video_id": video_id, "removed": True})


@router.patch("/{playlist_id}/reorder")
async def reorder_song(
    request: Request,
    playlist_id: str,
    body: ReorderBody,
    user: dict = Depends(get_current_user),
):
    await supabase_service.reorder_playlist_song(
        playlist_id, user["id"], body.video_id, body.new_position
    )
    return success({"playlist_id": playlist_id, "reordered": True})
