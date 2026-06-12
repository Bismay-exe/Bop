"""Small shared helpers."""
from __future__ import annotations


def duration_to_seconds(duration: str | None) -> int | None:
    """'3:24' -> 204, '1:02:03' -> 3723. Returns None if unparseable."""
    if not duration:
        return None
    try:
        parts = [int(p) for p in duration.split(":")]
    except (ValueError, AttributeError):
        return None
    seconds = 0
    for part in parts:
        seconds = seconds * 60 + part
    return seconds


def best_thumbnail(thumbnails: list[dict] | None) -> str | None:
    """ytmusicapi returns a list of {url,width,height}; pick the largest."""
    if not thumbnails:
        return None
    try:
        return max(thumbnails, key=lambda t: t.get("width", 0)).get("url")
    except (ValueError, AttributeError, TypeError):
        return thumbnails[-1].get("url") if thumbnails else None


def first_artist_name(artists: list[dict] | None) -> str | None:
    if not artists:
        return None
    return artists[0].get("name")


def join_artist_names(artists: list[dict] | None) -> str | None:
    if not artists:
        return None
    names = [a.get("name") for a in artists if a.get("name")]
    return ", ".join(names) if names else None
