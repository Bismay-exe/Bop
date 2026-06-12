"""yt-dlp audio extraction — the most sensitive path.

Corrections baked in:
  P4  yt-dlp latency is 5-12s, not 1-3s → generous socket/extraction timeout.
  P6  /stream is real-time extraction → kept simple for MVP, but the function
      boundary is the seam where an extraction cache / URL-refresh service slots
      in later. Nothing here caches.
  P7  yt-dlp is blocking/heavy → run in threadpool; no Celery yet.
  format  PREFER bestaudio DIRECT stream. We do NOT force an ffmpeg transcode on
      the hot path — that is CPU-heavy and slow. We ask yt-dlp for the best m4a
      audio-only format and return its direct googlevideo URL. ffmpeg stays in
      the image only as a fallback for odd formats; it is never invoked here.

Stream URLs are NEVER cached (PRD §9/§19) — they expire ~6h and must be fresh.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import structlog
import yt_dlp
from fastapi.concurrency import run_in_threadpool

from app.config import settings
from app.utils.errors import APIError

log = structlog.get_logger()

# bestaudio, prefer m4a container, audio-only — NO postprocessing/transcode.
_FORMAT_SELECTOR = "bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio/best"

# Default URL lifetime assumption (googlevideo URLs ~6h). Used for expiresAt hint.
_URL_TTL_HOURS = 6


def _build_opts() -> dict[str, Any]:
    return {
        "format": _FORMAT_SELECTOR,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        # P4: tolerate slow/cold YouTube. socket_timeout guards each network op.
        "socket_timeout": settings.YTDLP_TIMEOUT_SECONDS,
        "extractor_retries": 2,
        "cachedir": False,
        # YouTube increasingly serves a "confirm you're not a bot" challenge to
        # the default web client. The android/ios/tv clients use the InnerTube
        # API and bypass that challenge WITHOUT cookies — the standard yt-dlp
        # workaround. We list several so yt-dlp falls through on failure.
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "ios", "tv", "web"],
            }
        },
        # No postprocessors → no ffmpeg transcode on the hot path.
    }


def _pick_format(info: dict[str, Any]) -> dict[str, Any] | None:
    """yt-dlp already applied the format selector; `url` is on the info dict for
    a single chosen format, but when multiple remain we scan requested_formats."""
    if info.get("url"):
        return info
    requested = info.get("requested_formats")
    if requested:
        # Audio-only entry.
        for f in requested:
            if f.get("acodec") and f.get("acodec") != "none":
                return f
        return requested[0]
    formats = info.get("formats") or []
    audio_only = [f for f in formats if f.get("acodec") not in (None, "none") and f.get("vcodec") in (None, "none")]
    if audio_only:
        return max(audio_only, key=lambda f: f.get("abr") or 0)
    return None


def _extract_sync(video_id: str) -> dict[str, Any]:
    url = f"https://www.youtube.com/watch?v={video_id}"
    with yt_dlp.YoutubeDL(_build_opts()) as ydl:
        info = ydl.extract_info(url, download=False)

    if not info:
        raise APIError("STREAM_UNAVAILABLE", "No audio found for this track")

    chosen = _pick_format(info)
    if not chosen or not chosen.get("url"):
        raise APIError("STREAM_UNAVAILABLE", "No streamable audio URL found")

    abr = chosen.get("abr") or chosen.get("tbr")
    ext = chosen.get("ext") or settings.YTDLP_AUDIO_FORMAT
    duration = info.get("duration")
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=_URL_TTL_HOURS)).isoformat()

    return {
        "videoId": video_id,
        "streamUrl": chosen["url"],
        "format": ext,
        "bitrate": int(abr) if abr else None,
        "duration_seconds": int(duration) if duration else None,
        "expiresAt": expires_at,
    }


async def extract_stream(video_id: str) -> dict[str, Any]:
    """Return a fresh stream descriptor. Never cached. Runs off the event loop."""
    try:
        result = await run_in_threadpool(_extract_sync, video_id)
    except APIError:
        raise
    except yt_dlp.utils.DownloadError as exc:  # noqa: PERF203
        msg = str(exc).lower()
        if "unavailable" in msg or "private" in msg or "not available" in msg:
            raise APIError("STREAM_UNAVAILABLE", "This track is unavailable") from exc
        if "sign in" in msg or "not a bot" in msg or "confirm" in msg:
            # YouTube anti-bot challenge — transient; client should retry.
            raise APIError(
                "STREAM_EXTRACTION_FAILED",
                "YouTube rate-limited this request, please retry",
            ) from exc
        raise APIError("STREAM_EXTRACTION_FAILED", f"yt-dlp error: {exc}") from exc
    except Exception as exc:  # noqa: BLE001
        raise APIError("STREAM_EXTRACTION_FAILED", f"Extraction failed: {exc}") from exc

    log.info(
        "stream_extracted",
        video_id=video_id,
        format=result["format"],
        bitrate=result["bitrate"],
    )
    return result


def is_available() -> bool:
    try:
        return bool(yt_dlp.version.__version__)
    except Exception:
        return False
