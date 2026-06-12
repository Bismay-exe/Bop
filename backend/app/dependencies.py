"""Auth dependencies (PRD §7).

`get_current_user` — required auth. Raises AUTH_REQUIRED if no bearer token,
AUTH_INVALID if verification fails.

`get_optional_user` — returns the user if a valid token is present, else None.
Used by endpoints that work with or without auth (e.g. /stream in Phase 2,
which is open but applies a higher rate limit when authenticated).
"""
from __future__ import annotations

from typing import Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth_service import verify_token
from app.utils.errors import APIError

_required = HTTPBearer(auto_error=False)
_optional = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_required),
) -> dict:
    if credentials is None or not credentials.credentials:
        raise APIError("AUTH_REQUIRED", "Authentication required")
    return verify_token(credentials.credentials)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional),
) -> Optional[dict]:
    if credentials is None or not credentials.credentials:
        return None
    try:
        return verify_token(credentials.credentials)
    except APIError:
        # Optional auth: a bad token is treated as anonymous, not an error.
        return None
