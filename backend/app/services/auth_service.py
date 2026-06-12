"""Supabase JWT verification (PRD §7) — robust to both signing methods.

Supabase signs access tokens one of two ways depending on project age/config:

  • Legacy HS256 — symmetric, signed with the project's JWT secret
    (Settings → API → JWT Secret). Verified with SUPABASE_JWT_SECRET.

  • Modern asymmetric ES256/RS256 — signed with a private key; the public key
    is published at <project>/auth/v1/.well-known/jwks.json. Verified by fetching
    the JWKS and matching on the token header's `kid`.

We auto-detect from the token header's `alg` so the same backend works for any
Supabase project without reconfiguration. JWKS is fetched lazily and cached.
"""
from __future__ import annotations

import time
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient

from app.config import settings
from app.utils.errors import APIError

# PyJWKClient caches keys internally, but we also guard creation so we only
# build it once and only when an asymmetric token actually arrives.
_jwk_client: PyJWKClient | None = None
_jwk_client_created_at: float = 0.0
_JWK_CLIENT_TTL = 3600  # rebuild hourly to pick up key rotation


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client, _jwk_client_created_at
    now = time.time()
    if _jwk_client is None or (now - _jwk_client_created_at) > _JWK_CLIENT_TTL:
        if not settings.SUPABASE_URL:
            raise APIError("AUTH_INVALID", "Auth not configured (no SUPABASE_URL)", 500)
        _jwk_client = PyJWKClient(settings.jwks_url, cache_keys=True)
        _jwk_client_created_at = now
    return _jwk_client


def _decode_asymmetric(token: str, alg: str) -> dict[str, Any]:
    client = _get_jwk_client()
    try:
        signing_key = client.get_signing_key_from_jwt(token)
    except Exception as exc:  # noqa: BLE001
        raise APIError("AUTH_INVALID", "Could not resolve token signing key") from exc
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=[alg],
        audience="authenticated",
        options={"verify_aud": True},
    )


def _decode_symmetric(token: str) -> dict[str, Any]:
    if not settings.SUPABASE_JWT_SECRET:
        raise APIError("AUTH_INVALID", "Auth not configured (no SUPABASE_JWT_SECRET)", 500)
    return jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
        options={"verify_aud": True},
    )


def verify_token(token: str) -> dict[str, Any]:
    """Verify a Supabase access token and return a normalized user dict.

    Raises APIError(AUTH_INVALID / AUTH_REQUIRED) on any failure.
    """
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise APIError("AUTH_INVALID", "Malformed token") from exc

    alg = header.get("alg", "HS256")

    try:
        if alg == "HS256":
            payload = _decode_symmetric(token)
        elif alg in ("ES256", "RS256"):
            payload = _decode_asymmetric(token, alg)
        else:
            raise APIError("AUTH_INVALID", f"Unsupported token algorithm: {alg}")
    except jwt.ExpiredSignatureError as exc:
        raise APIError("AUTH_INVALID", "Token expired") from exc
    except jwt.InvalidAudienceError as exc:
        raise APIError("AUTH_INVALID", "Invalid token audience") from exc
    except jwt.InvalidTokenError as exc:
        raise APIError("AUTH_INVALID", "Invalid token") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise APIError("AUTH_INVALID", "Token missing subject")

    # user_metadata holds Google profile fields (name, avatar) for OAuth logins.
    meta = payload.get("user_metadata") or {}
    return {
        "id": user_id,
        "email": payload.get("email"),
        "display_name": meta.get("full_name") or meta.get("name"),
        "avatar_url": meta.get("avatar_url") or meta.get("picture"),
    }


async def jwks_reachable() -> bool:
    """Best-effort health probe for the JWKS endpoint."""
    if not settings.SUPABASE_URL:
        return False
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(settings.jwks_url)
            return r.status_code == 200
    except Exception:  # noqa: BLE001
        return False
