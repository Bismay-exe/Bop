"""All ytmusicapi calls (unauthenticated YouTube Music).

Every ytmusicapi call is blocking, so we run them in a threadpool to keep the
async event loop free (P7 seam — no Celery, just `run_in_threadpool`).

Normalisation helpers convert ytmusicapi's raw dicts into the dicts the PRD
JSON shapes expect (see app/models/schemas.py).
"""
from __future__ import annotations

from typing import Any

import structlog
from fastapi.concurrency import run_in_threadpool
from ytmusicapi import YTMusic

from app.utils.errors import APIError
from app.utils.helpers import (
    best_thumbnail,
    duration_to_seconds,
    first_artist_name,
    join_artist_names,
)

log = structlog.get_logger()

# Single shared client. ytmusicapi is thread-safe for read calls.
_yt: YTMusic | None = None


def get_client() -> YTMusic:
    global _yt
    if _yt is None:
        _yt = YTMusic()
    return _yt


def is_available() -> bool:
    try:
        get_client()
        return True
    except Exception:
        return False


# ─── Normalisers ────────────────────────────────────────────────────────────
def _norm_song(item: dict[str, Any]) -> dict[str, Any]:
    duration = item.get("duration")
    return {
        "videoId": item.get("videoId"),
        "title": item.get("title", "Unknown"),
        "artist": join_artist_names(item.get("artists")),
        "album": (item.get("album") or {}).get("name") if isinstance(item.get("album"), dict) else item.get("album"),
        "duration": duration,
        "duration_seconds": item.get("duration_seconds") or duration_to_seconds(duration),
        "thumbnail": best_thumbnail(item.get("thumbnails")),
        "isExplicit": item.get("isExplicit", False),
    }


def _norm_artist_ref(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "artistId": item.get("browseId") or item.get("artistId"),
        "name": item.get("artist") or item.get("title") or item.get("name", "Unknown"),
        "thumbnail": best_thumbnail(item.get("thumbnails")),
    }


def _norm_album_ref(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "browseId": item.get("browseId"),
        "title": item.get("title", "Unknown"),
        "artist": join_artist_names(item.get("artists")) or item.get("artist"),
        "year": item.get("year"),
        "thumbnail": best_thumbnail(item.get("thumbnails")),
    }


def _norm_playlist_ref(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "playlistId": item.get("browseId") or item.get("playlistId"),
        "title": item.get("title", "Unknown"),
        "author": item.get("author") if isinstance(item.get("author"), str) else first_artist_name(item.get("author")),
        "thumbnail": best_thumbnail(item.get("thumbnails")),
    }


# ─── Search (PRD §8) ────────────────────────────────────────────────────────
_FILTER_MAP = {
    "songs": "songs",
    "artists": "artists",
    "albums": "albums",
    "playlists": "playlists",
    "videos": "videos",
}


async def search(query: str, search_type: str = "top", limit: int = 20) -> dict[str, Any]:
    client = get_client()

    def _safe(filter_name: str, limit_n: int) -> list:
        """One category search, isolated. ytmusicapi can raise KeyError
        ('musicSelfRenderer', etc.) parsing an unexpected result type for a given
        query — that must not take down the whole search. Returns [] on failure."""
        try:
            return client.search(query, filter=filter_name, limit=limit_n)
        except Exception as exc:  # noqa: BLE001
            log.warning("search_category_failed", filter=filter_name, error=str(exc))
            return []

    def _safe_map(items: list, fn) -> list:
        out = []
        for it in items:
            try:
                out.append(fn(it))
            except Exception:  # noqa: BLE001
                continue
        return out

    def _run() -> dict[str, Any]:
        if search_type == "top":
            # Lightweight: fetch a small slice of each main category, each
            # isolated so a parser failure in one still returns the others.
            return {
                "query": query,
                "type": "top",
                "songs": _safe_map(_safe("songs", 5), _norm_song),
                "artists": _safe_map(_safe("artists", 5), _norm_artist_ref),
                "albums": _safe_map(_safe("albums", 5), _norm_album_ref),
            }

        yt_filter = _FILTER_MAP.get(search_type)
        if yt_filter is None:
            raise APIError("SEARCH_FAILED", f"Unknown search type '{search_type}'", 400)

        raw = _safe(yt_filter, limit)
        if search_type == "songs" or search_type == "videos":
            results = _safe_map(raw, _norm_song)
        elif search_type == "artists":
            results = _safe_map(raw, _norm_artist_ref)
        elif search_type == "albums":
            results = _safe_map(raw, _norm_album_ref)
        else:  # playlists
            results = _safe_map(raw, _norm_playlist_ref)
        return {"query": query, "type": search_type, "results": results}

    try:
        return await run_in_threadpool(_run)
    except APIError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise APIError("SEARCH_FAILED", f"Search failed: {exc}") from exc


async def search_suggestions(query: str) -> dict[str, Any]:
    client = get_client()
    try:
        suggestions = await run_in_threadpool(client.get_search_suggestions, query)
        # ytmusicapi may return list[str] or list[dict]; normalise to strings.
        flat = [s if isinstance(s, str) else s.get("text", "") for s in suggestions]
        return {"suggestions": [s for s in flat if s]}
    except Exception as exc:  # noqa: BLE001
        raise APIError("SEARCH_FAILED", f"Suggestions failed: {exc}") from exc


# ─── Explore (PRD §11) ──────────────────────────────────────────────────────
def _chart_song_list(charts: dict[str, Any], client: YTMusic) -> list[dict[str, Any]]:
    """ytmusicapi 1.12 returns chart *playlists* (daily/weekly) rather than a
    flat songs list. Resolve the first daily chart playlist into tracks. Falls
    back to legacy `songs` shape if a future/older version provides it."""
    legacy = charts.get("songs")
    if isinstance(legacy, dict) and legacy.get("items"):
        return [_norm_song(s) for s in legacy["items"]]
    if isinstance(legacy, list) and legacy:
        return [_norm_song(s) for s in legacy]

    for key in ("daily", "weekly"):
        entries = charts.get(key)
        if isinstance(entries, list) and entries and entries[0].get("playlistId"):
            try:
                pl = client.get_playlist(entries[0]["playlistId"], limit=50)
                return [_norm_song(t) for t in pl.get("tracks", [])]
            except Exception:  # noqa: BLE001
                continue
    return []


async def get_charts(country: str) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        charts = client.get_charts(country=country)
        artists_raw = charts.get("artists")
        artists = artists_raw.get("items", []) if isinstance(artists_raw, dict) else (artists_raw or [])
        videos_raw = charts.get("videos")
        videos = videos_raw.get("items", []) if isinstance(videos_raw, dict) else (videos_raw or [])
        return {
            "country": country,
            "songs": _chart_song_list(charts, client),
            "videos": [_norm_song(v) for v in videos],
            "artists": [_norm_artist_ref(a) for a in artists],
        }

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001
        raise APIError("UPSTREAM_ERROR", f"Charts failed: {exc}") from exc


async def get_mood_categories() -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        cats = client.get_mood_categories()
        out: list[dict[str, Any]] = []
        for section, items in (cats or {}).items():
            for item in items:
                out.append({"title": item.get("title"), "params": item.get("params"), "section": section})
        return {"moods": out}

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001
        raise APIError("UPSTREAM_ERROR", f"Moods failed: {exc}") from exc


async def get_home(limit: int = 3) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        sections = client.get_home(limit=limit)
        out_sections: list[dict[str, Any]] = []
        for section in sections or []:
            contents = []
            for item in section.get("contents", []):
                if item.get("videoId"):
                    contents.append(_norm_song(item))
                elif item.get("browseId"):
                    contents.append(_norm_album_ref(item))
            out_sections.append({"title": section.get("title"), "contents": contents})
        return {"sections": out_sections}

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001
        raise APIError("UPSTREAM_ERROR", f"Home feed failed: {exc}") from exc


# ─── Artist (PRD §12) ───────────────────────────────────────────────────────
async def get_artist(artist_id: str) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        a = client.get_artist(artist_id)
        top_songs = (a.get("songs") or {}).get("results", []) if isinstance(a.get("songs"), dict) else []
        albums = (a.get("albums") or {}).get("results", []) if isinstance(a.get("albums"), dict) else []
        singles = (a.get("singles") or {}).get("results", []) if isinstance(a.get("singles"), dict) else []
        related = (a.get("related") or {}).get("results", []) if isinstance(a.get("related"), dict) else []
        return {
            "artistId": artist_id,
            "name": a.get("name", "Unknown"),
            "description": a.get("description"),
            "subscribers": a.get("subscribers"),
            "thumbnail": best_thumbnail(a.get("thumbnails")),
            "topSongs": [_norm_song(s) for s in top_songs],
            "albums": [_norm_album_ref(al) for al in albums],
            "singles": [_norm_album_ref(s) for s in singles],
            "relatedArtists": [_norm_artist_ref(r) for r in related],
        }

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001
        raise APIError("UPSTREAM_ERROR", f"Artist lookup failed: {exc}") from exc


# ─── Album (PRD §13) ────────────────────────────────────────────────────────
async def get_album(browse_id: str) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        al = client.get_album(browse_id)
        tracks = []
        for i, t in enumerate(al.get("tracks", []), start=1):
            duration = t.get("duration")
            tracks.append({
                "videoId": t.get("videoId"),
                "title": t.get("title", "Unknown"),
                "trackNumber": t.get("trackNumber", i),
                "duration": duration,
                "duration_seconds": t.get("duration_seconds") or duration_to_seconds(duration),
                "isExplicit": t.get("isExplicit", False),
            })
        return {
            "browseId": browse_id,
            "title": al.get("title", "Unknown"),
            "artist": join_artist_names(al.get("artists")),
            "year": al.get("year"),
            "thumbnail": best_thumbnail(al.get("thumbnails")),
            "trackCount": al.get("trackCount", len(tracks)),
            "tracks": tracks,
        }

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001
        raise APIError("UPSTREAM_ERROR", f"Album lookup failed: {exc}") from exc


# ─── Recommendations (PRD §10) — YouTube Music's own engine ─────────────────
async def get_radio(video_id: str) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        wp = client.get_watch_playlist(videoId=video_id, radio=True)
        tracks = [_norm_song(t) for t in wp.get("tracks", [])]
        return {
            "radioId": wp.get("playlistId") or f"RDAMVM{video_id}",
            "seedVideoId": video_id,
            "tracks": tracks,
        }

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001
        raise APIError("UPSTREAM_ERROR", f"Radio failed: {exc}") from exc


async def get_related(video_id: str) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        wp = client.get_watch_playlist(videoId=video_id, radio=False)
        tracks = [_norm_song(t) for t in wp.get("tracks", [])]
        # Drop the seed track itself if present at head.
        tracks = [t for t in tracks if t.get("videoId") != video_id]
        return {"tracks": tracks}

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001
        raise APIError("UPSTREAM_ERROR", f"Related failed: {exc}") from exc


async def get_mix(playlist_id: str) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        pl = client.get_playlist(playlist_id, limit=50)
        tracks = [_norm_song(t) for t in pl.get("tracks", [])]
        return {"playlistId": playlist_id, "title": pl.get("title"), "tracks": tracks}

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001
        raise APIError("UPSTREAM_ERROR", f"Mix failed: {exc}") from exc


async def get_artist_mix(artist_id: str) -> dict[str, Any]:
    """Radio seeded from an artist. We resolve the artist's top track, then radio it."""
    client = get_client()

    def _run() -> dict[str, Any]:
        a = client.get_artist(artist_id)
        top = (a.get("songs") or {}).get("results", []) if isinstance(a.get("songs"), dict) else []
        if not top or not top[0].get("videoId"):
            return {"tracks": []}
        seed = top[0]["videoId"]
        wp = client.get_watch_playlist(videoId=seed, radio=True)
        return {"seedVideoId": seed, "tracks": [_norm_song(t) for t in wp.get("tracks", [])]}

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001
        raise APIError("UPSTREAM_ERROR", f"Artist mix failed: {exc}") from exc


# ─── Lyrics (PRD §14) ───────────────────────────────────────────────────────
async def get_lyrics(video_id: str) -> dict[str, Any]:
    client = get_client()

    def _run() -> dict[str, Any]:
        wp = client.get_watch_playlist(videoId=video_id)
        browse_id = wp.get("lyrics")
        if not browse_id:
            return {"videoId": video_id, "lyrics": None, "hasTimestamps": False, "source": None}
        ly = client.get_lyrics(browse_id)
        return {
            "videoId": video_id,
            "lyrics": ly.get("lyrics"),
            "hasTimestamps": bool(ly.get("hasTimestamps", False)),
            "source": ly.get("source", "YouTube Music"),
        }

    try:
        return await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001
        raise APIError("UPSTREAM_ERROR", f"Lyrics failed: {exc}") from exc
