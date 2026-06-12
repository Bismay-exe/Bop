"""/user — profile management (PRD §17). All routes require auth."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.services import supabase_service
from app.utils.errors import APIError, success

router = APIRouter(prefix="/user", tags=["user"])


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None


@router.get("/profile")
async def get_profile(request: Request, user: dict = Depends(get_current_user)):
    row = await supabase_service.get_user(user["id"])
    if row is None:
        # Not synced yet — return the JWT-derived identity as a fallback.
        return success(
            {
                "id": user["id"],
                "email": user.get("email"),
                "display_name": user.get("display_name"),
                "avatar_url": user.get("avatar_url"),
            }
        )
    return success(row)


@router.patch("/profile")
async def update_profile(
    request: Request,
    body: ProfileUpdate,
    user: dict = Depends(get_current_user),
):
    if body.display_name is None and body.avatar_url is None:
        raise APIError("INTERNAL_ERROR", "No fields to update", 400)
    row = await supabase_service.update_user(
        user_id=user["id"],
        display_name=body.display_name,
        avatar_url=body.avatar_url,
    )
    return success(row)
