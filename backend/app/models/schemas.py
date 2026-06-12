"""Pydantic response models (camelCase out, matching the PRD JSON shapes).

These mirror exactly what the Expo frontend expects so the API surface is the
contract. ytmusicapi's raw shapes are normalised into these in the services.
"""
from __future__ import annotations

from pydantic import BaseModel


class Song(BaseModel):
    videoId: str | None = None
    title: str
    artist: str | None = None
    album: str | None = None
    duration: str | None = None
    duration_seconds: int | None = None
    thumbnail: str | None = None
    isExplicit: bool = False


class ArtistRef(BaseModel):
    artistId: str | None = None
    name: str
    thumbnail: str | None = None


class AlbumRef(BaseModel):
    browseId: str | None = None
    title: str
    artist: str | None = None
    year: str | None = None
    thumbnail: str | None = None


class PlaylistRef(BaseModel):
    playlistId: str | None = None
    title: str
    author: str | None = None
    thumbnail: str | None = None


class AlbumTrack(BaseModel):
    videoId: str | None = None
    title: str
    trackNumber: int | None = None
    duration: str | None = None
    duration_seconds: int | None = None
    isExplicit: bool = False


class StreamInfo(BaseModel):
    videoId: str
    streamUrl: str
    format: str
    bitrate: int | None = None
    duration_seconds: int | None = None
    expiresAt: str | None = None


class Lyrics(BaseModel):
    videoId: str
    lyrics: str | None = None
    hasTimestamps: bool = False
    source: str | None = None
