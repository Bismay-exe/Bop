# BOP Music Backend

FastAPI middleware that turns YouTube Music into a clean REST API for the Expo
app. It fetches metadata via **ytmusicapi**, extracts audio stream URLs via
**yt-dlp**, and (from Phase 2) stores user data in **Supabase**. It never stores
audio — YouTube's CDN streams directly to the device.

> Phase 1 (current): core music + playback, **no auth**. All routes open.

## Endpoints (Phase 1)

All under `/api/v1`:

| Route | Purpose |
|---|---|
| `GET /search?q=&type=top\|songs\|artists\|albums\|playlists\|videos&limit=` | Tab-based search |
| `GET /search/suggestions?q=` | Autocomplete |
| `GET /stream/{video_id}` | **Real-time** yt-dlp extraction → fresh stream URL (never cached) |
| `GET /explore/home` `/trending` `/charts` `/moods` | Discovery feeds |
| `GET /recommendations/radio/{video_id}` `/related/{video_id}` `/mix/{playlist_id}` `/artist-mix/{artist_id}` | YT Music's own engine |
| `GET /artist/{id}` `/artist/{id}/songs` `/artist/{id}/albums` | Artist pages |
| `GET /album/{browse_id}` | Album tracklist |
| `GET /lyrics/{video_id}` | Lyrics (24h cache) |
| `GET /health` | Liveness + dependency status |

Every response uses the envelope `{ success, data, error }`.

## Run locally

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env          # adjust CORS_ORIGINS for your Expo dev host

uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs for interactive docs, or hit
http://localhost:8000/health.

### Point the Expo app at it
Set `EXPO_PUBLIC_API_URL` in the app to `http://<your-LAN-ip>:8000/api/v1`
(use the LAN IP, not `localhost`, so a physical device can reach it).

## Design notes (corrections baked in)

- **bestaudio direct, no forced transcode** — `/stream` returns the direct
  googlevideo URL; ffmpeg is a fallback only, never on the hot path.
- **yt-dlp latency is 5–12s** — generous `socket_timeout` (`YTDLP_TIMEOUT_SECONDS`,
  default 15). The frontend prefetches only the **next 1–2** tracks.
- **Stream URLs are never cached** — they expire ~6h; always fetched fresh.
- **TTLCache is MVP-only** — in-memory; Redis is a future swap, not built.
- **No Celery/RQ** — blocking yt-dlp/ytmusicapi calls run in a threadpool.

## Deploy (Railway)

1. Connect the GitHub repo; set **root directory** to `backend/`.
2. Add env vars from `.env.example` (set `ENVIRONMENT=production`,
   `LOG_FORMAT=json`, real `CORS_ORIGINS`).
3. Railway builds the `Dockerfile` (includes ffmpeg) and runs uvicorn on `$PORT`.
4. Health check path: `/health`.
