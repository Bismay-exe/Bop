# Product Requirements Document
## Music Streaming Backend — FastAPI + ytmusicapi + yt-dlp + Supabase

**Version:** 2.0 (revised — 6 corrections applied)
**Platform:** Backend API (connects to Expo React Native frontend)
**Stack:** Python 3.11+, FastAPI, ytmusicapi, yt-dlp, Supabase
**Date:** June 2026

---

## Revision Notes (v1.0 → v2.0)

Six issues were corrected from v1.0:

1. **Playback** — removed expo-av. Frontend MUST use react-native-track-player (already in use). Backend serves stream URLs; TrackPlayer consumes them.
2. **Recommendations** — removed custom recommendation logic. Use YouTube Music's own radio/mix/related-tracks engine via ytmusicapi. No reinventing the wheel.
3. **Search response shape** — changed from one fat response to tab-based lazy loading. `/search` returns a lightweight list of top hits only. Full tab results fetched separately on demand.
4. **Auth simplification** — removed redundant backend JWT layer. Supabase JWT is verified directly on FastAPI using Supabase's JWKS. One token, no wrapping.
5. **Stream protection** — `/stream/{video_id}` is now auth-required by default. Added per-user quotas + IP rate limits + structured abuse prevention.
6. **Observability** — added structured logging, request tracing, health metrics, and error tracking strategy.

---

## 1. Overview

This document defines the complete backend for converting an existing offline Expo React Native music player into a fully online streaming app. The backend is a middleware layer — it fetches music metadata from YouTube Music via ytmusicapi, extracts streamable audio URLs via yt-dlp, manages user data in Supabase, and exposes everything as a clean REST API.

The backend never stores audio files. Audio streams directly from YouTube's CDN to the user's device. The backend only fetches, transforms, and forwards.

The frontend uses **react-native-track-player** exclusively for playback. The backend's only job regarding audio is returning a fresh stream URL — TrackPlayer does the rest (background playback, notifications, lock screen, queue, Android audio focus).

---

## 2. Goals

- Production-ready FastAPI backend the Expo frontend can call
- Full music discovery: search, trending, charts, artist pages, albums, moods
- Audio playback via yt-dlp stream URLs consumed by TrackPlayer
- Recommendations powered by YouTube Music's own radio/mix engine — no custom ML
- User auth via Supabase JWT (verified directly — no second JWT layer)
- User data (liked songs, playlists, history) stored in Supabase
- Protected stream endpoint with per-user quotas and IP rate limits
- Structured logging and observability from day one
- Entirely free to run

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────┐
│            Expo React Native Frontend                  │
│                                                        │
│  react-native-track-player                             │
│  ├── background playback                               │
│  ├── lock screen controls                              │
│  ├── notification player                               │
│  ├── queue management                                  │
│  └── Android audio focus / iOS AVSession               │
│                                                        │
│  Flow: fetch stream URL from backend → hand to         │
│        TrackPlayer.add({ url: streamUrl })             │
└─────────────────────┬────────────────────────────────┘
                      │ HTTPS REST (Supabase JWT in header)
                      ↓
┌──────────────────────────────────────────────────────┐
│                FastAPI Backend                         │
│                                                        │
│  Auth: verify Supabase JWT directly via JWKS           │
│  No second JWT layer — Supabase token is enough        │
│                                                        │
│  ┌──────────────────┐  ┌────────────────────────┐    │
│  │   ytmusicapi     │  │       yt-dlp           │    │
│  │                  │  │                        │    │
│  │ search (tabbed)  │  │ extract audio URL      │    │
│  │ trending/charts  │  │ format: m4a (best)     │    │
│  │ artist/album     │  │ never cached           │    │
│  │ lyrics           │  │ auth-gated             │    │
│  │ watch playlist   │  └────────────────────────┘    │
│  │ radio/mixes ◄────┼── recommendations engine       │
│  │ related tracks   │                                 │
│  └──────────────────┘  ┌────────────────────────┐    │
│                        │      Supabase          │    │
│                        │                        │    │
│                        │ auth.users (Google)    │    │
│                        │ public.users           │    │
│                        │ liked_songs            │    │
│                        │ playlists              │    │
│                        │ playlist_songs         │    │
│                        │ listening_history      │    │
│                        └────────────────────────┘    │
│                                                        │
│  Middleware stack:                                     │
│  ├── structured logging (every request)               │
│  ├── request ID tracing                               │
│  ├── IP rate limiter                                  │
│  ├── per-user stream quota                            │
│  └── Supabase JWT verifier                            │
└─────────────────────┬────────────────────────────────┘
                      │ stream URL returned to TrackPlayer
                      ↓
┌──────────────────────────────────────────────────────┐
│             YouTube CDN Servers                        │
│   Audio streams directly to device — you pay nothing  │
└──────────────────────────────────────────────────────┘
```

---

## 4. Project Structure

```
music-backend/
├── app/
│   ├── main.py                   # FastAPI app, middleware stack, lifespan
│   ├── config.py                 # Settings via pydantic-settings
│   ├── dependencies.py           # get_current_user, get_optional_user
│   │
│   ├── routers/
│   │   ├── search.py             # /search — tabbed, lazy
│   │   ├── stream.py             # /stream — auth-required, quota-gated
│   │   ├── explore.py            # /explore/trending, /charts, /moods, /home
│   │   ├── recommendations.py    # /recommendations — radio, mixes, related
│   │   ├── artist.py             # /artist
│   │   ├── album.py              # /album
│   │   ├── lyrics.py             # /lyrics
│   │   ├── auth.py               # /auth — sync user profile after login
│   │   ├── user.py               # /user — profile management
│   │   ├── library.py            # /library — liked songs, history
│   │   └── playlist.py           # /playlist — CRUD + song management
│   │
│   ├── services/
│   │   ├── ytmusic_service.py    # All ytmusicapi calls
│   │   ├── stream_service.py     # All yt-dlp calls
│   │   └── supabase_service.py   # All DB operations
│   │
│   ├── models/
│   │   ├── song.py               # Song, Track pydantic models
│   │   ├── artist.py
│   │   ├── album.py
│   │   ├── playlist.py
│   │   └── user.py
│   │
│   ├── middleware/
│   │   ├── logging.py            # Structured request/response logger
│   │   ├── rate_limit.py         # IP + per-user rate limiting
│   │   └── request_id.py         # X-Request-ID injection
│   │
│   └── utils/
│       ├── cache.py              # TTLCache wrappers
│       └── helpers.py
│
├── logs/                         # Structured JSON logs (local dev)
├── .env
├── .env.example
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## 5. Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret   # from Supabase dashboard → Settings → API

# App
ENVIRONMENT=development                          # development | production
CORS_ORIGINS=http://localhost:8081,exp://192.168.x.x:8081

# yt-dlp
YTDLP_AUDIO_FORMAT=m4a
YTDLP_AUDIO_QUALITY=0                           # 0 = best

# Rate limiting
STREAM_RATE_LIMIT_PER_MINUTE=30                 # per authenticated user
STREAM_RATE_LIMIT_IP_PER_MINUTE=60             # per IP (unauthenticated)
SEARCH_RATE_LIMIT_PER_MINUTE=60

# Observability
LOG_LEVEL=INFO                                   # DEBUG | INFO | WARNING | ERROR
LOG_FORMAT=json                                  # json | text (text for local dev)
```

---

## 6. Dependencies (requirements.txt)

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
ytmusicapi>=1.7.0
yt-dlp>=2024.5.1
supabase>=2.4.0
PyJWT>=2.8.0                    # for verifying Supabase JWT directly
python-multipart>=0.0.9
httpx>=0.27.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
python-dotenv>=1.0.0
cachetools>=5.3.0
slowapi>=0.1.9                  # rate limiting for FastAPI
structlog>=24.1.0               # structured logging
python-json-logger>=2.0.7
```

---

## 7. Auth Architecture — Simplified (No Double JWT)

### Why no backend JWT?

Supabase already issues a signed JWT. FastAPI can verify it directly using the Supabase JWT secret. Adding a second JWT layer means:
- Two tokens to manage
- Two expiry cycles to handle
- More code, more failure points
- Zero added security benefit

### The correct flow

```
1. User taps "Login with Google" in Expo app
         ↓
2. Supabase JS SDK handles Google OAuth
         ↓
3. Supabase returns: access_token (JWT), refresh_token
         ↓
4. Expo stores both tokens (SecureStore)
         ↓
5. Every API request to FastAPI includes:
   Authorization: Bearer <supabase_access_token>
         ↓
6. FastAPI middleware verifies JWT using SUPABASE_JWT_SECRET
   No external call needed — pure local verification
         ↓
7. Decoded user ID (sub) used for all DB operations
         ↓
8. When token expires → Expo refreshes via Supabase SDK
   New access_token used going forward
```

### FastAPI JWT verification (no extra library needed beyond PyJWT)

```python
# app/dependencies.py
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": user_id, "email": payload.get("email")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))
):
    # For endpoints that work with or without auth
    if not credentials:
        return None
    return await get_current_user(credentials)
```

### POST /auth/sync
After login, Expo calls this once to upsert the user profile in your DB.

```
POST /auth/sync
Authorization: Bearer <supabase_access_token>

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@gmail.com",
    "display_name": "User Name",
    "avatar_url": "https://..."
  }
}
```

This is the only auth endpoint needed. No `/auth/google`, no `/auth/refresh`, no custom token generation.

---

## 8. Search — Tab-Based Lazy Loading

### The Problem with Fat Search Responses

Returning songs + artists + albums + playlists in one call means:
- Large payload even if user only wants songs
- Slow response (ytmusicapi fetches all categories)
- Frontend renders what it needs, wastes the rest

### The Correct Approach — YouTube Music's Own Tab Pattern

```
GET /search?q=Believer&type=top          ← fast, top 5 results per type
GET /search?q=Believer&type=songs        ← full songs list only
GET /search?q=Believer&type=artists      ← full artists list only
GET /search?q=Believer&type=albums       ← full albums list only
GET /search?q=Believer&type=playlists    ← full playlists list only
GET /search?q=Believer&type=videos       ← videos only
```

Frontend loads the `top` view immediately, then lazy-fetches the tab the user actually opens.

### GET /search

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| q | string | required | Search query |
| type | string | top | top / songs / artists / albums / playlists / videos |
| limit | integer | 20 | Max results (max 50) |

**Response for type=top (fast, lightweight):**
```json
{
  "success": true,
  "data": {
    "query": "Believer",
    "type": "top",
    "songs": [
      {
        "videoId": "abc123",
        "title": "Believer",
        "artist": "Imagine Dragons",
        "album": "Evolve",
        "duration": "3:24",
        "duration_seconds": 204,
        "thumbnail": "https://...",
        "isExplicit": false
      }
    ],
    "artists": [ { "artistId": "...", "name": "...", "thumbnail": "..." } ],
    "albums":  [ { "browseId": "...", "title": "...", "artist": "...", "year": "2017", "thumbnail": "..." } ]
  }
}
```

**Response for type=songs (full list):**
```json
{
  "success": true,
  "data": {
    "query": "Believer",
    "type": "songs",
    "results": [ { ...song objects... } ]
  }
}
```

### GET /search/suggestions

**Query params:** `q` (string, required)

```json
{
  "success": true,
  "data": {
    "suggestions": ["believer imagine dragons", "believer dreamers", "..."]
  }
}
```

---

## 9. Stream Endpoint — Protected & Quota-Gated

This is the most sensitive endpoint. It calls yt-dlp which is slow (1–3s) and can be abused.

### GET /stream/{video_id}

**Auth:** Required (Supabase JWT)
**Rate limit:** 30 requests/minute per user, 10 requests/minute per IP for unauthenticated

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| quality | string | high | high / medium / low |
| format | string | m4a | m4a / mp3 |

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "abc123",
    "streamUrl": "https://rr1---sn-xxx.googlevideo.com/...",
    "format": "m4a",
    "bitrate": 128,
    "duration_seconds": 204,
    "expiresAt": "2026-06-11T20:00:00Z"
  }
}
```

**Rules:**
- Stream URLs expire in ~6 hours — NEVER cache them
- Always fetch fresh URL when TrackPlayer needs to play
- Unauthenticated requests get 10/min IP limit (preview use only)
- Authenticated users get 30/min (normal use)

### How TrackPlayer Uses This (Frontend pattern)

```javascript
// services/trackPlayer.js
import TrackPlayer from 'react-native-track-player';
import { getStreamUrl } from './api';

export const addAndPlay = async (song) => {
  // 1. Fetch fresh stream URL from your backend
  const { streamUrl, duration_seconds } = await getStreamUrl(song.videoId);

  // 2. Add to TrackPlayer queue — TrackPlayer handles everything else
  await TrackPlayer.add({
    id: song.videoId,
    url: streamUrl,                        // ← your backend provides this
    title: song.title,
    artist: song.artist,
    artwork: song.thumbnail,
    duration: duration_seconds,
  });

  await TrackPlayer.play();
};

// For queue (radio/mix — see recommendations section)
export const loadQueue = async (songs) => {
  const tracksWithUrls = await Promise.all(
    songs.map(async (song) => {
      const { streamUrl } = await getStreamUrl(song.videoId);
      return {
        id: song.videoId,
        url: streamUrl,
        title: song.title,
        artist: song.artist,
        artwork: song.thumbnail,
        duration: song.duration_seconds,
      };
    })
  );
  await TrackPlayer.add(tracksWithUrls);
};
```

**Note:** For queues, pre-fetch the stream URL of the next 1–2 tracks in the background while the current track is playing. TrackPlayer's `PlaybackQueueEnded` event is your trigger to fetch more.

---

## 10. Recommendations — Powered by YouTube Music Engine

**Do not build a recommendation engine.** YouTube Music has already built one. Use it.

ytmusicapi exposes three recommendation surfaces:

### GET /recommendations/radio/{video_id}
YouTube Music radio based on a seed track. Returns ~25 tracks.

```json
{
  "success": true,
  "data": {
    "radioId": "RDAMVMabc123",
    "seedVideoId": "abc123",
    "tracks": [ { ...song objects... } ]
  }
}
```

**Use case:** User finishes a song, auto-play continues via radio. Load the radio tracks into TrackPlayer queue.

### GET /recommendations/mix/{playlist_id}
YouTube Music "My Mix" or "Discover Mix" style playlists.

### GET /recommendations/related/{video_id}
Related tracks shown on the "Up next" panel in YouTube Music.

```json
{
  "success": true,
  "data": {
    "tracks": [ { ...song objects... } ]
  }
}
```

**Use case:** "You might also like" section after a song ends.

### GET /recommendations/artist-mix/{artist_id}
Radio based on an artist — all their best tracks + similar artists.

### Frontend queue strategy with recommendations

```javascript
// When user plays a song:
// 1. Play the song immediately
// 2. In background, fetch radio for that song
// 3. Load radio tracks into TrackPlayer queue
// 4. TrackPlayer handles transitions seamlessly

const playSongWithRadio = async (song) => {
  await addAndPlay(song);                              // plays immediately
  const { tracks } = await getRadio(song.videoId);    // background
  await loadQueue(tracks);                             // fills queue
};
```

---

## 11. Explore Routes

### GET /explore/home
Home feed — mix of trending, new releases, and mood playlists.

```json
{
  "success": true,
  "data": {
    "trending": [ { ...song... } ],
    "newReleases": [ { ...album... } ],
    "moods": [ { "title": "Chill", "playlistId": "PLxxx", "thumbnail": "..." } ]
  }
}
```

### GET /explore/trending
**Query params:** `country` (string, default "IN"), `limit` (int, default 20)

### GET /explore/charts
**Query params:** `country` (string, default "IN")

Returns top songs, top videos, top artists for that country/global.

### GET /explore/moods
Returns mood and genre playlist categories (Chill, Party, Workout, Focus, etc.).

### GET /explore/new-releases
Recent album/single releases.

---

## 12. Artist Routes

### GET /artist/{artist_id}
Full artist profile.

```json
{
  "success": true,
  "data": {
    "artistId": "UCxxx",
    "name": "Imagine Dragons",
    "description": "...",
    "subscribers": "30M",
    "thumbnail": "https://...",
    "topSongs": [ { ...song... } ],
    "albums": [ { ...album... } ],
    "singles": [ { ...album... } ],
    "relatedArtists": [ { "artistId": "...", "name": "...", "thumbnail": "..." } ]
  }
}
```

### GET /artist/{artist_id}/songs
All songs. **Query params:** `limit`, `offset`

### GET /artist/{artist_id}/albums
All albums and singles.

---

## 13. Album Routes

### GET /album/{browse_id}

```json
{
  "success": true,
  "data": {
    "browseId": "MPREbxxx",
    "title": "Evolve",
    "artist": "Imagine Dragons",
    "year": "2017",
    "thumbnail": "https://...",
    "trackCount": 12,
    "tracks": [
      {
        "videoId": "abc123",
        "title": "Believer",
        "trackNumber": 2,
        "duration": "3:24",
        "duration_seconds": 204,
        "isExplicit": false
      }
    ]
  }
}
```

---

## 14. Lyrics Routes

### GET /lyrics/{video_id}

```json
{
  "success": true,
  "data": {
    "videoId": "abc123",
    "lyrics": "Full lyrics text here...",
    "hasTimestamps": false,
    "source": "YouTube Music"
  }
}
```

Cached for 24 hours — lyrics never change.

---

## 15. Library Routes (all require auth)

### GET /library/liked
**Query params:** `limit` (default 50), `offset` (default 0)

### POST /library/liked/{video_id}
Like a song. Body:
```json
{
  "title": "Believer",
  "artist": "Imagine Dragons",
  "thumbnail_url": "https://...",
  "duration_seconds": 204
}
```

### DELETE /library/liked/{video_id}

### GET /library/liked/{video_id}/status
Returns `{ "liked": true }` or `{ "liked": false }`. Cheap check before rendering heart icon.

### GET /library/history
**Query params:** `limit` (default 30), `offset` (default 0)

### POST /library/history
Called by frontend after a song finishes playing.
```json
{
  "video_id": "abc123",
  "title": "Believer",
  "artist": "Imagine Dragons",
  "thumbnail_url": "https://...",
  "play_duration_seconds": 204
}
```

### DELETE /library/history
Clear all history.

---

## 16. Playlist Routes

### GET /playlist
All playlists for current user. **Auth required.**

### POST /playlist
Create new playlist. **Auth required.**
```json
{ "name": "My Playlist", "description": "...", "is_public": false }
```

### GET /playlist/{playlist_id}
Public playlists accessible without auth. Private require auth.

### PATCH /playlist/{playlist_id}
Update name/description/visibility. **Auth required.**

### DELETE /playlist/{playlist_id}
**Auth required.**

### POST /playlist/{playlist_id}/songs
Add song. **Auth required.**
```json
{
  "video_id": "abc123",
  "title": "Believer",
  "artist": "Imagine Dragons",
  "thumbnail_url": "https://...",
  "duration_seconds": 204
}
```

### DELETE /playlist/{playlist_id}/songs/{video_id}
**Auth required.**

### PATCH /playlist/{playlist_id}/reorder
Reorder a song. **Auth required.**
```json
{ "video_id": "abc123", "new_position": 3 }
```

---

## 17. User Routes

### GET /user/profile
Current user's profile. **Auth required.**

### PATCH /user/profile
Update display name or avatar. **Auth required.**
```json
{ "display_name": "New Name", "avatar_url": "https://..." }
```

---

## 18. Supabase Database Schema

### 18.1 users
```sql
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);
```

### 18.2 liked_songs
```sql
create table public.liked_songs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  video_id text not null,
  title text not null,
  artist text not null,
  thumbnail_url text,
  duration_seconds integer,
  liked_at timestamptz default now(),
  unique(user_id, video_id)
);

alter table public.liked_songs enable row level security;

create policy "Users manage own liked songs"
  on public.liked_songs for all using (auth.uid() = user_id);

create index idx_liked_songs_user_id on public.liked_songs(user_id);
create index idx_liked_songs_liked_at on public.liked_songs(liked_at desc);
```

### 18.3 playlists
```sql
create table public.playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  description text,
  thumbnail_url text,
  is_public boolean default false,
  song_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.playlists enable row level security;

create policy "Users manage own playlists"
  on public.playlists for all using (auth.uid() = user_id);

create policy "Anyone can view public playlists"
  on public.playlists for select using (is_public = true);
```

### 18.4 playlist_songs
```sql
create table public.playlist_songs (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references public.playlists(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  video_id text not null,
  title text not null,
  artist text not null,
  thumbnail_url text,
  duration_seconds integer,
  position integer not null,
  added_at timestamptz default now(),
  unique(playlist_id, video_id)
);

alter table public.playlist_songs enable row level security;

create policy "Users manage own playlist songs"
  on public.playlist_songs for all using (auth.uid() = user_id);

create index idx_playlist_songs_playlist_id on public.playlist_songs(playlist_id);
create index idx_playlist_songs_position on public.playlist_songs(playlist_id, position);
```

### 18.5 listening_history
```sql
create table public.listening_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  video_id text not null,
  title text not null,
  artist text not null,
  thumbnail_url text,
  played_at timestamptz default now(),
  play_duration_seconds integer default 0
);

alter table public.listening_history enable row level security;

create policy "Users manage own history"
  on public.listening_history for all using (auth.uid() = user_id);

create index idx_history_user_id on public.listening_history(user_id);
create index idx_history_played_at on public.listening_history(played_at desc);
```

---

## 19. Caching Strategy

| Data | TTL | Notes |
|---|---|---|
| Search results (type=songs/artists etc.) | 5 min | Consistent enough |
| Search top results | 2 min | Faster invalidation |
| Trending / Charts | 1 hour | Updates ~daily |
| Artist info | 30 min | Stable |
| Album info | 1 hour | Fully static |
| Lyrics | 24 hours | Never changes |
| Home feed | 15 min | Semi-static |
| Radio/mix tracks | 10 min | Refreshes nicely |
| **Stream URLs** | **NEVER** | Expire ~6h, always fresh |

```python
# app/utils/cache.py
from cachetools import TTLCache

search_cache  = TTLCache(maxsize=500,  ttl=300)
charts_cache  = TTLCache(maxsize=50,   ttl=3600)
artist_cache  = TTLCache(maxsize=200,  ttl=1800)
album_cache   = TTLCache(maxsize=200,  ttl=3600)
lyrics_cache  = TTLCache(maxsize=1000, ttl=86400)
home_cache    = TTLCache(maxsize=20,   ttl=900)
radio_cache   = TTLCache(maxsize=300,  ttl=600)
# No stream_cache — intentionally omitted
```

---

## 20. Rate Limiting

```python
# Using slowapi

# Per IP (applies to everyone)
/stream/*            → 10/minute   (unauthenticated)
/search              → 60/minute
/explore/*           → 60/minute
/auth/sync           → 5/minute

# Per authenticated user (overrides IP limit when logged in)
/stream/*            → 30/minute
/library/*           → 120/minute
/playlist/*          → 60/minute
```

Stream endpoint abuse prevention layers:
1. Auth required (no anonymous hammering at scale)
2. Per-user rate limit (30/min)
3. Per-IP rate limit (10/min for non-auth, shared limit)
4. yt-dlp itself is slow (natural bottleneck ~2s per call)

---

## 21. Error Handling

All errors return consistent shape:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "STREAM_UNAVAILABLE",
    "message": "Could not extract audio for this track",
    "status": 404,
    "requestId": "req_abc123"
  }
}
```

### Error Codes
| Code | HTTP | Meaning |
|---|---|---|
| SEARCH_FAILED | 500 | ytmusicapi error |
| STREAM_UNAVAILABLE | 404 | yt-dlp found nothing |
| STREAM_EXTRACTION_FAILED | 500 | yt-dlp threw an error |
| SONG_NOT_FOUND | 404 | Video ID invalid |
| AUTH_REQUIRED | 401 | No token on protected route |
| AUTH_INVALID | 401 | Token expired or malformed |
| AUTH_FORBIDDEN | 403 | Resource belongs to another user |
| RATE_LIMITED | 429 | Too many requests |
| QUOTA_EXCEEDED | 429 | Per-user stream quota hit |
| INTERNAL_ERROR | 500 | Unexpected error |

---

## 22. Observability — Structured Logging

Every request logs a JSON line. No print statements.

### Request log (every request)
```json
{
  "event": "request",
  "request_id": "req_abc123",
  "method": "GET",
  "path": "/api/v1/stream/abc123",
  "user_id": "uuid-or-null",
  "ip": "1.2.3.4",
  "timestamp": "2026-06-11T10:00:00Z"
}
```

### Response log (every response)
```json
{
  "event": "response",
  "request_id": "req_abc123",
  "status_code": 200,
  "duration_ms": 1843,
  "path": "/api/v1/stream/abc123",
  "cache_hit": false
}
```

### Error log
```json
{
  "event": "error",
  "request_id": "req_abc123",
  "error_code": "STREAM_EXTRACTION_FAILED",
  "video_id": "abc123",
  "exception": "yt-dlp: HTTP Error 429",
  "duration_ms": 3001
}
```

### yt-dlp specific log
```json
{
  "event": "stream_extracted",
  "video_id": "abc123",
  "format": "m4a",
  "duration_ms": 1750,
  "user_id": "uuid"
}
```

### Implementation using structlog
```python
# app/middleware/logging.py
import structlog
import uuid
from starlette.middleware.base import BaseHTTPMiddleware

log = structlog.get_logger()

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = f"req_{request_id}"

        log.info("request",
            request_id=request.state.request_id,
            method=request.method,
            path=request.url.path,
            ip=request.client.host
        )

        import time
        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000)

        log.info("response",
            request_id=request.state.request_id,
            status_code=response.status_code,
            duration_ms=duration_ms
        )

        response.headers["X-Request-ID"] = request.state.request_id
        return response
```

### Health check endpoint
```
GET /health

{
  "status": "ok",
  "version": "2.0.0",
  "ytmusicapi": "available",
  "ytdlp": "available",
  "supabase": "connected",
  "uptime_seconds": 3600
}
```

Use this for Railway/Render health checks and monitoring.

---

## 23. CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "exp://192.168.x.x:8081",
        "https://your-production-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
```

---

## 24. Frontend ↔ Backend Integration Summary

### API client (Expo)
```javascript
// services/api.js
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const apiClient = async (endpoint, options = {}) => {
  const token = await SecureStore.getItemAsync('supabase_access_token');

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Request failed');
  return data.data;
};

// Key API calls
export const searchTracks   = (q, type = 'top') => apiClient(`/search?q=${encodeURIComponent(q)}&type=${type}`);
export const getStreamUrl   = (videoId)         => apiClient(`/stream/${videoId}`);
export const getTrending    = (country = 'IN')  => apiClient(`/explore/trending?country=${country}`);
export const getRadio       = (videoId)         => apiClient(`/recommendations/radio/${videoId}`);
export const getRelated     = (videoId)         => apiClient(`/recommendations/related/${videoId}`);
export const getLyrics      = (videoId)         => apiClient(`/lyrics/${videoId}`);
export const syncProfile    = ()                => apiClient('/auth/sync', { method: 'POST' });
export const likeSong       = (videoId, meta)   => apiClient(`/library/liked/${videoId}`, { method: 'POST', body: JSON.stringify(meta) });
export const unlikeSong     = (videoId)         => apiClient(`/library/liked/${videoId}`, { method: 'DELETE' });
export const recordHistory  = (meta)            => apiClient('/library/history', { method: 'POST', body: JSON.stringify(meta) });
```

### TrackPlayer integration
```javascript
// services/player.js
import TrackPlayer, { Event } from 'react-native-track-player';
import { getStreamUrl, getRadio, recordHistory } from './api';

// Play a single song and seed the radio queue
export const playSong = async (song) => {
  const { streamUrl, duration_seconds } = await getStreamUrl(song.videoId);

  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: song.videoId,
    url: streamUrl,
    title: song.title,
    artist: song.artist,
    artwork: song.thumbnail,
    duration: duration_seconds,
  });
  await TrackPlayer.play();

  // Background: seed queue with radio
  getRadio(song.videoId).then(({ tracks }) => loadQueueInBackground(tracks));
};

// Pre-fetch stream URLs and load into TrackPlayer queue
const loadQueueInBackground = async (songs) => {
  for (const song of songs.slice(0, 5)) {   // pre-fetch next 5
    try {
      const { streamUrl } = await getStreamUrl(song.videoId);
      await TrackPlayer.add({
        id: song.videoId,
        url: streamUrl,
        title: song.title,
        artist: song.artist,
        artwork: song.thumbnail,
        duration: song.duration_seconds,
      });
    } catch (e) {
      // Skip unavailable tracks silently
    }
  }
};

// Record history when track ends
TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async ({ nextTrack }) => {
  const track = await TrackPlayer.getTrack(nextTrack);
  if (track) {
    recordHistory({
      video_id: track.id,
      title: track.title,
      artist: track.artist,
      thumbnail_url: track.artwork,
      play_duration_seconds: track.duration,
    }).catch(() => {});  // fire and forget
  }
});
```

---

## 25. Deployment

### Railway (Recommended — free tier)
- Connect GitHub repo
- Set all env vars in Railway dashboard
- Railway auto-detects Python, runs uvicorn
- Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `GET /health`

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Note:** `ffmpeg` is required by yt-dlp for audio format conversion.

---

## 26. Development Phases

### Phase 1 — Core Music, No Auth (Week 1)
- [ ] Project setup, folder structure, all dependencies
- [ ] ytmusicapi: search (tabbed), trending, charts, artist, album
- [ ] yt-dlp: stream URL extraction
- [ ] Lyrics endpoint
- [ ] Recommendations: radio, related, mix
- [ ] Home feed endpoint
- [ ] Caching on all non-stream routes
- [ ] Structured logging middleware
- [ ] Health check endpoint
- [ ] CORS for Expo dev
- [ ] Test: Expo TrackPlayer playing a song end-to-end

### Phase 2 — Auth & Profile (Week 2)
- [ ] Supabase tables created via Claude MCP
- [ ] Google OAuth enabled in Supabase dashboard
- [ ] Supabase JWT verification in FastAPI (no extra layer)
- [ ] POST /auth/sync
- [ ] GET/PATCH /user/profile
- [ ] Rate limiting on stream endpoint

### Phase 3 — Library & Playlists (Week 3)
- [ ] /library/liked CRUD
- [ ] /library/history
- [ ] /playlist CRUD
- [ ] Playlist song management + reorder
- [ ] TrackPlayer history recording

### Phase 4 — Harden & Deploy (Week 4)
- [ ] Full rate limiting across all routes
- [ ] Stream quota enforcement
- [ ] Error codes standardised
- [ ] Request ID tracing end-to-end
- [ ] Deploy to Railway with ffmpeg
- [ ] Smoke test all endpoints from device

---

## 27. Key Technical Decisions

| Decision | Chosen | Why |
|---|---|---|
| Framework | FastAPI | Async, auto docs, Pydantic |
| Music data | ytmusicapi | No quota limits, full YT Music |
| Audio | yt-dlp | Most reliable, actively maintained |
| Player | react-native-track-player | Background, notifications, queue |
| Recommendations | ytmusicapi radio/mix | YT's own engine, zero effort |
| Search shape | Tab-based lazy | Fast initial load, smaller payloads |
| Auth | Supabase JWT direct verify | No double token, simpler code |
| Database | Supabase Postgres | Free tier, RLS, Google OAuth built-in |
| Cache | cachetools TTLCache | No Redis needed, free |
| Logging | structlog JSON | Machine-readable, searchable |
| Hosting | Railway | Easiest, ffmpeg support |
| Audio storage | None (by design) | Zero cost, YouTube serves audio |

---

*This is v2.0 — the authoritative PRD. All implementation follows this document.*
