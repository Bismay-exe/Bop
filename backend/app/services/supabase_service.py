"""All Supabase DB operations (PRD §4 services/supabase_service.py).

The backend uses the SERVICE ROLE key, which bypasses RLS. That's safe because
every call here is scoped to a `user_id` that came from a verified JWT — the
backend is the trusted enforcer. RLS still protects against any direct client
access to the database.

Phase 2 scope: user profile upsert + read/update. Library/playlist operations
(liked_songs, playlists, history) arrive in Phase 3 but the client is shared.
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi.concurrency import run_in_threadpool

from app.config import settings
from app.utils.errors import APIError

# Lazily-created singleton so importing this module never requires Supabase to
# be configured (Phase 1 endpoints keep working without it).
_client: Any = None


def get_client() -> Any:
    global _client
    if _client is None:
        if not settings.supabase_configured:
            raise APIError(
                "INTERNAL_ERROR",
                "Supabase is not configured (SUPABASE_URL / SERVICE_ROLE_KEY missing)",
                500,
            )
        from supabase import create_client  # imported lazily

        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _client


def is_configured() -> bool:
    return settings.supabase_configured


# ─── Users (PRD §18.1) ──────────────────────────────────────────────────────
async def upsert_user(
    user_id: str,
    email: Optional[str],
    display_name: Optional[str],
    avatar_url: Optional[str],
) -> dict[str, Any]:
    """Insert or update the public.users row after login (/auth/sync)."""
    client = get_client()

    def _run() -> dict[str, Any]:
        payload = {
            "id": user_id,
            "email": email or "",
            "display_name": display_name,
            "avatar_url": avatar_url,
        }
        # on_conflict=id → upsert by primary key.
        res = client.table("users").upsert(payload, on_conflict="id").execute()
        rows = res.data or []
        return rows[0] if rows else payload

    try:
        return await run_in_threadpool(_run)
    except APIError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise APIError("INTERNAL_ERROR", f"User sync failed: {exc}", 500) from exc


async def get_user(user_id: str) -> Optional[dict[str, Any]]:
    client = get_client()

    def _run() -> Optional[dict[str, Any]]:
        res = client.table("users").select("*").eq("id", user_id).limit(1).execute()
        rows = res.data or []
        return rows[0] if rows else None

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001
        raise APIError("INTERNAL_ERROR", f"Profile fetch failed: {exc}", 500) from exc


async def update_user(
    user_id: str,
    display_name: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> dict[str, Any]:
    client = get_client()

    fields: dict[str, Any] = {}
    if display_name is not None:
        fields["display_name"] = display_name
    if avatar_url is not None:
        fields["avatar_url"] = avatar_url
    if not fields:
        # Nothing to update — return current row.
        current = await get_user(user_id)
        if current is None:
            raise APIError("SONG_NOT_FOUND", "User not found", 404)
        return current

    def _run() -> dict[str, Any]:
        res = client.table("users").update(fields).eq("id", user_id).execute()
        rows = res.data or []
        if not rows:
            raise APIError("AUTH_FORBIDDEN", "User not found or not permitted", 404)
        return rows[0]

    try:
        return await run_in_threadpool(_run)
    except APIError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise APIError("INTERNAL_ERROR", f"Profile update failed: {exc}", 500) from exc


# ─── Liked songs (PRD §15 / §18.2) ──────────────────────────────────────────
async def list_liked(user_id: str, limit: int, offset: int) -> list[dict[str, Any]]:
    client = get_client()

    def _run() -> list[dict[str, Any]]:
        res = (
            client.table("liked_songs")
            .select("*")
            .eq("user_id", user_id)
            .order("liked_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return res.data or []

    return await _guard(_run, "Liked songs fetch failed")


async def add_liked(user_id: str, video_id: str, meta: dict[str, Any]) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        payload = {
            "user_id": user_id,
            "video_id": video_id,
            "title": meta.get("title") or "Unknown",
            "artist": meta.get("artist") or "Unknown",
            "thumbnail_url": meta.get("thumbnail_url"),
            "duration_seconds": meta.get("duration_seconds"),
        }
        res = (
            client.table("liked_songs")
            .upsert(payload, on_conflict="user_id,video_id")
            .execute()
        )
        rows = res.data or []
        return rows[0] if rows else payload

    return await _guard(_run, "Like failed")


async def remove_liked(user_id: str, video_id: str) -> None:
    client = get_client()

    def _run() -> None:
        client.table("liked_songs").delete().eq("user_id", user_id).eq(
            "video_id", video_id
        ).execute()

    await _guard(_run, "Unlike failed")


async def is_liked(user_id: str, video_id: str) -> bool:
    client = get_client()

    def _run() -> bool:
        res = (
            client.table("liked_songs")
            .select("id")
            .eq("user_id", user_id)
            .eq("video_id", video_id)
            .limit(1)
            .execute()
        )
        return bool(res.data)

    return await _guard(_run, "Like status check failed")


# ─── Listening history (PRD §15 / §18.5) ────────────────────────────────────
async def list_history(user_id: str, limit: int, offset: int) -> list[dict[str, Any]]:
    client = get_client()

    def _run() -> list[dict[str, Any]]:
        res = (
            client.table("listening_history")
            .select("*")
            .eq("user_id", user_id)
            .order("played_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return res.data or []

    return await _guard(_run, "History fetch failed")


async def add_history(user_id: str, meta: dict[str, Any]) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        payload = {
            "user_id": user_id,
            "video_id": meta.get("video_id"),
            "title": meta.get("title") or "Unknown",
            "artist": meta.get("artist") or "Unknown",
            "thumbnail_url": meta.get("thumbnail_url"),
            "play_duration_seconds": meta.get("play_duration_seconds") or 0,
        }
        res = client.table("listening_history").insert(payload).execute()
        rows = res.data or []
        return rows[0] if rows else payload

    return await _guard(_run, "History record failed")


async def clear_history(user_id: str) -> None:
    client = get_client()

    def _run() -> None:
        client.table("listening_history").delete().eq("user_id", user_id).execute()

    await _guard(_run, "History clear failed")


# ─── Playlists (PRD §16 / §18.3-18.4) ───────────────────────────────────────
async def list_playlists(user_id: str) -> list[dict[str, Any]]:
    client = get_client()

    def _run() -> list[dict[str, Any]]:
        res = (
            client.table("playlists")
            .select("*")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )
        return res.data or []

    return await _guard(_run, "Playlists fetch failed")


async def create_playlist(
    user_id: str, name: str, description: str | None, is_public: bool
) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        payload = {
            "user_id": user_id,
            "name": name,
            "description": description,
            "is_public": is_public,
        }
        res = client.table("playlists").insert(payload).execute()
        rows = res.data or []
        return rows[0] if rows else payload

    return await _guard(_run, "Playlist create failed")


async def get_playlist(playlist_id: str, user_id: str | None) -> dict[str, Any]:
    """Return a playlist + its songs. Private playlists require ownership."""
    client = get_client()

    def _run() -> dict[str, Any]:
        res = (
            client.table("playlists").select("*").eq("id", playlist_id).limit(1).execute()
        )
        rows = res.data or []
        if not rows:
            raise APIError("SONG_NOT_FOUND", "Playlist not found", 404)
        pl = rows[0]
        if not pl.get("is_public") and pl.get("user_id") != user_id:
            raise APIError("AUTH_FORBIDDEN", "This playlist is private", 403)
        songs_res = (
            client.table("playlist_songs")
            .select("*")
            .eq("playlist_id", playlist_id)
            .order("position", desc=False)
            .execute()
        )
        pl["songs"] = songs_res.data or []
        return pl

    return await _guard(_run, "Playlist fetch failed")


async def update_playlist(
    playlist_id: str, user_id: str, fields: dict[str, Any]
) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        res = (
            client.table("playlists")
            .update(fields)
            .eq("id", playlist_id)
            .eq("user_id", user_id)
            .execute()
        )
        rows = res.data or []
        if not rows:
            raise APIError("AUTH_FORBIDDEN", "Playlist not found or not yours", 404)
        return rows[0]

    return await _guard(_run, "Playlist update failed")


async def delete_playlist(playlist_id: str, user_id: str) -> None:
    client = get_client()

    def _run() -> None:
        client.table("playlists").delete().eq("id", playlist_id).eq(
            "user_id", user_id
        ).execute()

    await _guard(_run, "Playlist delete failed")


async def add_playlist_song(
    playlist_id: str, user_id: str, video_id: str, meta: dict[str, Any]
) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        # Verify ownership first.
        owner = (
            client.table("playlists")
            .select("id")
            .eq("id", playlist_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not owner.data:
            raise APIError("AUTH_FORBIDDEN", "Playlist not found or not yours", 404)

        # Next position = current max + 1.
        existing = (
            client.table("playlist_songs")
            .select("position")
            .eq("playlist_id", playlist_id)
            .order("position", desc=True)
            .limit(1)
            .execute()
        )
        next_pos = (existing.data[0]["position"] + 1) if existing.data else 0

        payload = {
            "playlist_id": playlist_id,
            "user_id": user_id,
            "video_id": video_id,
            "title": meta.get("title") or "Unknown",
            "artist": meta.get("artist") or "Unknown",
            "thumbnail_url": meta.get("thumbnail_url"),
            "duration_seconds": meta.get("duration_seconds"),
            "position": next_pos,
        }
        res = (
            client.table("playlist_songs")
            .upsert(payload, on_conflict="playlist_id,video_id")
            .execute()
        )
        _recount_playlist(client, playlist_id)
        rows = res.data or []
        return rows[0] if rows else payload

    return await _guard(_run, "Add to playlist failed")


async def remove_playlist_song(playlist_id: str, user_id: str, video_id: str) -> None:
    client = get_client()

    def _run() -> None:
        owner = (
            client.table("playlists")
            .select("id")
            .eq("id", playlist_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not owner.data:
            raise APIError("AUTH_FORBIDDEN", "Playlist not found or not yours", 404)
        client.table("playlist_songs").delete().eq("playlist_id", playlist_id).eq(
            "video_id", video_id
        ).execute()
        _recount_playlist(client, playlist_id)

    await _guard(_run, "Remove from playlist failed")


async def reorder_playlist_song(
    playlist_id: str, user_id: str, video_id: str, new_position: int
) -> None:
    client = get_client()

    def _run() -> None:
        owner = (
            client.table("playlists")
            .select("id")
            .eq("id", playlist_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not owner.data:
            raise APIError("AUTH_FORBIDDEN", "Playlist not found or not yours", 404)

        rows = (
            client.table("playlist_songs")
            .select("id,video_id,position")
            .eq("playlist_id", playlist_id)
            .order("position", desc=False)
            .execute()
        ).data or []

        ordered = [r for r in rows if r["video_id"] != video_id]
        moving = next((r for r in rows if r["video_id"] == video_id), None)
        if moving is None:
            raise APIError("SONG_NOT_FOUND", "Song not in playlist", 404)
        target = max(0, min(new_position, len(ordered)))
        ordered.insert(target, moving)

        # Rewrite positions 0..n.
        for idx, row in enumerate(ordered):
            if row["position"] != idx:
                client.table("playlist_songs").update({"position": idx}).eq(
                    "id", row["id"]
                ).execute()

    await _guard(_run, "Reorder failed")


# ─── helpers ────────────────────────────────────────────────────────────────
def _recount_playlist(client: Any, playlist_id: str) -> None:
    """Keep playlists.song_count in sync after add/remove."""
    res = (
        client.table("playlist_songs")
        .select("id", count="exact")
        .eq("playlist_id", playlist_id)
        .execute()
    )
    count = res.count if res.count is not None else len(res.data or [])
    client.table("playlists").update({"song_count": count}).eq("id", playlist_id).execute()


async def _guard(fn, message: str):
    """Run a blocking DB fn in a threadpool, wrapping unexpected errors."""
    try:
        return await run_in_threadpool(fn)
    except APIError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise APIError("INTERNAL_ERROR", f"{message}: {exc}", 500) from exc
