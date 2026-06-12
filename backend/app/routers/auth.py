"""/auth — sync the user profile after login (PRD §7)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.dependencies import get_current_user
from app.services import supabase_service
from app.utils.errors import success

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sync")
async def sync_profile(request: Request, user: dict = Depends(get_current_user)):
    """Called once by the app after login. Upserts public.users from the JWT
    claims (Google profile lives in user_metadata). Idempotent."""
    row = await supabase_service.upsert_user(
        user_id=user["id"],
        email=user.get("email"),
        display_name=user.get("display_name"),
        avatar_url=user.get("avatar_url"),
    )
    return success(
        {
            "id": row.get("id", user["id"]),
            "email": row.get("email", user.get("email")),
            "display_name": row.get("display_name"),
            "avatar_url": row.get("avatar_url"),
        }
    )
