# Implementation Plan — Phase 1 MVP: Offline → Online Streaming

**Goal:** Stand up the FastAPI streaming backend (`./backend`) and wire the existing Expo app so a song plays **end-to-end from YouTube Music** via `react-native-track-player` — no auth yet. Local-file playback stays working ("Online primary, local kept").

This plan reflects the PRD ([docs/backend-PRD.md](backend-PRD.md)) **plus the 7 corrections** the user specified. Where they diverge, the corrections win.

---

## Decisions locked
- **Mode:** Online primary, local kept. `Song` gains a `source: 'local' | 'online'` discriminator. Existing stores/UI/components are reused for both.
- **Scope:** Phase 1 MVP only (core streaming + playback proven end-to-end). Auth/library/playlists deferred.
- **Home:** Monorepo `./backend`, Railway as deploy target (Dockerfile + ffmpeg authored now; actual deploy is the last MVP step).

## Corrections folded in (override PRD where conflicting)
- **P3 — no `Promise.all` queue prefetch.** Controlled concurrency: prefetch **only next 1–2** tracks, never the whole radio queue. (PRD §9/§24 `loadQueueInBackground` prefetching 5 is rejected.)
- **P4 — yt-dlp latency is 5–12s, not 1–3s.** Generous timeouts; lay groundwork for background prefetch; surface a loading state.
- **P5 — `TTLCache` is MVP-only.** In-memory now; Redis seam noted, **not** built.
- **P6 — `/stream` is real-time extraction.** Accept the bottleneck for MVP; structure `stream_service` so an extraction cache / refresh service can slot in later.
- **P7 — no Celery/RQ now.** Synchronous extraction in a threadpool; async-job seam noted only.
- **P9 — logging at scale.** `text` logs in dev, `json` in prod; no per-request body logging.
- **ffmpeg/format — prefer `bestaudio` direct stream; do NOT force conversion.** yt-dlp returns the direct googlevideo URL; no transcoding on the hot path. ffmpeg stays in the image only as a fallback.
- **Lazy queue — do NOT pre-resolve huge queues.** Resolve the current track, prefetch next 1–2, lazy-resolve the rest on demand.

---

## Part A — Backend (`./backend`)

### A0. Verify toolchain (first step, was blocked by a transient outage)
- Confirm Python 3.11+ (`python --version`), `pip`, and Docker presence. If Python is missing, install or use the Docker path for local runs.

### A1. Scaffold (per PRD §4)
```
backend/
  app/
    main.py            # FastAPI app, middleware stack, lifespan, /health
    config.py          # pydantic-settings
    dependencies.py    # get_optional_user stub (real JWT in Phase 2)
    routers/           # search, stream, explore, recommendations, artist, album, lyrics
    services/          # ytmusic_service, stream_service
    models/            # pydantic: song, artist, album (camelCase out)
    middleware/        # logging, request_id  (rate_limit stubbed; full in Phase 4)
    utils/             # cache (TTLCache), helpers, errors (envelope + codes)
  requirements.txt
  Dockerfile           # python:3.11-slim + ffmpeg
  .env.example         # NO secrets committed
  README.md
```

### A2. Core infra
- **Config** (`config.py`): pydantic-settings reads `.env`. Fields: `ENVIRONMENT`, `CORS_ORIGINS`, `YTDLP_AUDIO_FORMAT=m4a`, `YTDLP_AUDIO_QUALITY=0`, `LOG_LEVEL`, `LOG_FORMAT`. Supabase keys defined-but-optional in Phase 1.
- **Response envelope + errors** (`utils/errors.py`): `{success, data, error:{code,message,status,requestId}}` exactly per PRD §21. Central exception handlers map to the error-code table.
- **Logging** (`middleware/logging.py`): structlog, request-id injection, request/response lines with `duration_ms`. `text` in dev, `json` in prod (P9). **No body logging.**
- **CORS** (PRD §23): allow Expo dev origins from `CORS_ORIGINS`.
- **Caching** (`utils/cache.py`): `TTLCache` instances per PRD §19 (search, charts, artist, album, lyrics, home, radio). **No `stream_cache`** — intentional.
- **`/health`** (PRD §22): reports ytmusicapi/ytdlp availability + uptime. Used by Railway.

### A3. Services
- **`ytmusic_service.py`:** wraps `YTMusic()` (unauthenticated). Functions for search (tabbed), suggestions, trending/charts, artist, album, related/radio/mix, lyrics. Normalize ytmusicapi shapes → our pydantic models. Wrap blocking calls with `run_in_threadpool`.
- **`stream_service.py`** (the careful one — P4/P6/format):
  - `yt-dlp` with `format: 'bestaudio[ext=m4a]/bestaudio'` — **direct URL, no ffmpeg transcode on hot path.**
  - Generous socket/extraction timeout (~15s) for cold starts/throttling (P4).
  - Returns `{videoId, streamUrl, format, bitrate, duration_seconds, expiresAt}`.
  - **Never cached** (P5/§19). Structured so a future extraction-cache/refresh-service is a drop-in (P6).
  - Runs in threadpool so the event loop isn't blocked (P7 seam, no Celery).

### A4. Routers (Phase 1 set)
- `GET /search` (tabbed: top/songs/artists/albums/playlists/videos) + `GET /search/suggestions` — PRD §8.
- `GET /stream/{video_id}` — **open in Phase 1** (auth gating is Phase 2). Real-time extraction via `stream_service`.
- `GET /explore/home | /trending | /charts | /moods | /new-releases` — PRD §11.
- `GET /recommendations/radio/{video_id} | /related/{video_id} | /mix/{playlist_id} | /artist-mix/{artist_id}` — PRD §10.
- `GET /artist/{id}`, `/artist/{id}/songs`, `/artist/{id}/albums` — PRD §12.
- `GET /album/{browse_id}` — PRD §13.
- `GET /lyrics/{video_id}` — PRD §14 (24h cache).
- All non-stream routes cached; all responses use the envelope.

### A5. Deploy artifacts
- `Dockerfile` (PRD §25): `python:3.11-slim` + `ffmpeg`, uvicorn start.
- `.env.example`, `README.md` (run locally + Railway notes). Railway deploy is the final MVP step once the device test passes.

---

## Part B — Frontend wiring (existing Expo app)

### B1. Data model — add `source` discriminator
- [app/src/types/media.ts](app/src/types/media.ts): extend `CachedSong` with `source?: 'local' | 'online'` (defaults to `'local'` for existing data) and online-only optionals: `videoId?`, `thumbnailUrl?`, `streamExpiresAt?`. For online songs, `id := videoId`, `uri` is filled lazily at play time.
- Keeps all existing components (`SongCard`, `AlbumCard`, etc.) working unchanged — they read the same fields.

### B2. API client + env
- New `app/src/services/api/client.ts`: `fetch` wrapper following the existing [fetchLyrics.ts](app/src/services/lyrics/fetchLyrics.ts) pattern (AbortController, timeout, dedupe). Reads `EXPO_PUBLIC_API_URL`. Unwraps the `{success,data,error}` envelope. **No SecureStore/token yet** (Phase 2).
- New `app/src/services/api/endpoints.ts`: typed wrappers — `searchTracks`, `getStreamUrl`, `getTrending`, `getExploreHome`, `getRadio`, `getRelated`, `getLyrics`, mapping API songs → our `Song` (`source:'online'`).
- Add `EXPO_PUBLIC_API_URL` to env; document in app `.env.example`.

### B3. Streaming playback — extend `TrackPlayerService` (the core of the corrections)
In [app/src/services/TrackPlayerService.ts](app/src/services/TrackPlayerService.ts):
- **`mapSongToTrack`**: for `source:'online'`, the `url` must be a fresh stream URL resolved at add-time (not the empty `uri`). Add `playOnlineSong(song)` and `playOnlineWithRadio(song)`.
- **Lazy resolution (corrections):**
  - Resolve **current** track's stream URL → `TrackPlayer.add` → `play()`.
  - In background, fetch radio/related for the queue **metadata only** (no stream URLs yet).
  - **Prefetch next 1–2** stream URLs only — `prefetchQueueWindow(maxAhead = 2)` with a small concurrency cap (sequential or limit 1–2). **No `Promise.all` over the whole queue** (P3).
  - On `PlaybackActiveTrackChanged`, advance the window: resolve the new "next 1–2", drop stale URLs. (P4 background-prefetch groundwork.)
  - Re-resolve on demand if a track's URL is missing/expired when it becomes active (handles 6h expiry + skip-ahead).
- Reuse the existing event-sync; online tracks flow through the same `setCurrentTrack` path. The `librarySong` lookup in the existing handler gets a fallback so online tracks (not in `libraryStore.songs`) still populate correctly from the Track payload (already partially handled at lines 98–109).

### B4. Minimal UI proof (end-to-end test target)
- Wire the existing **Search** screen to `searchTracks` (online results rendered with existing `SongCard`), tapping a result calls `playOnlineWithRadio`.
- Optionally surface `getExploreHome`/trending on Home. Keep local library section intact.
- Loading state on tap (P4 — extraction can take 5–12s).

### B5. End-to-end verification (Phase 1 "done")
- Backend running locally; `EXPO_PUBLIC_API_URL` → LAN IP.
- Search → tap → song streams and plays with lock-screen/notification controls (RNTP already handles these).
- Next 1–2 prefetch confirmed (only 1–2 `/stream` calls ahead, not N).
- Then deploy backend to Railway, repoint env, smoke-test from device.

---

## Out of scope (later phases, per "Phase 1 MVP first")
- Supabase JWT verification, `/auth/sync`, `/user/*` (Phase 2).
- `/library/*`, `/playlist/*`, history recording, liked-songs sync (Phase 3).
- Full rate limiting + per-user stream quota (Phase 4).
- Redis, Celery/RQ, extraction cache, log sampling/rotation — **seams noted, not built** (P5/P6/P7/P9).

## Risks / watch-items
- **react-native-track-player is a `5.0.0-alpha` nightly** — streaming-URL behavior and event names (`PlaybackActiveTrackChanged` vs old `PlaybackTrackChanged`) must be verified against the installed build before relying on them.
- **yt-dlp on YouTube** is inherently brittle (throttling/format changes); 5–12s latency and occasional extraction failures are expected — UI must degrade gracefully.
- **Expo SDK 56** is current per AGENTS.md; will verify any native config against the v56 docs before changing `app.json`/plugins.
