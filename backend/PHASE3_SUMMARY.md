# Phase 3 — Library & Playlists: Summary

Cloud sync for liked songs, listening history, and playlists. Tables already
exist from the Phase 2 migration ([0001_init.sql](supabase/migrations/0001_init.sql)) —
no new schema needed.

---

## Backend (all auth-required)

### `/library` ([routers/library.py](app/routers/library.py))
| Method | Route | Purpose |
|---|---|---|
| GET | `/library/liked?limit&offset` | List liked songs (newest first) |
| POST | `/library/liked/{video_id}` | Like a song (idempotent upsert) |
| DELETE | `/library/liked/{video_id}` | Unlike |
| GET | `/library/liked/{video_id}/status` | `{ liked: bool }` — cheap heart check |
| GET | `/library/history?limit&offset` | Listening history (newest first) |
| POST | `/library/history` | Record a play |
| DELETE | `/library/history` | Clear all history |

### `/playlist` ([routers/playlist.py](app/routers/playlist.py))
| Method | Route | Purpose |
|---|---|---|
| GET | `/playlist` | User's playlists |
| POST | `/playlist` | Create |
| GET | `/playlist/{id}` | Playlist + ordered songs (public viewable without auth) |
| PATCH | `/playlist/{id}` | Rename / description / visibility |
| DELETE | `/playlist/{id}` | Delete |
| POST | `/playlist/{id}/songs` | Add song (auto-positioned at end) |
| DELETE | `/playlist/{id}/songs/{video_id}` | Remove song |
| PATCH | `/playlist/{id}/reorder` | Move a song to `new_position` |

All DB ops live in [supabase_service.py](app/services/supabase_service.py), run in a
threadpool, scoped to the JWT's `user_id`. `playlists.song_count` is kept in sync
on every add/remove. Ownership is enforced server-side on every mutation.

## App

- **[api/endpoints.ts](../app/src/services/api/endpoints.ts)** — typed wrappers for all
  the above + `cloudSongToSong` / `songToMeta` mappers.
- **[cloudLibraryStore.ts](../app/src/store/cloudLibraryStore.ts)** — liked songs +
  playlists, **kept separate** from the local `libraryStore` (whose `finalizeScan`
  reconciles against device files and would wipe online videoIds). Like toggles
  are **optimistic** with rollback on failure.
- **[authStore.ts](../app/src/store/authStore.ts)** — refreshes the cloud library on
  sign-in / session-restore; clears it on sign-out.
- **History recording** — [TrackPlayerService.ts](../app/src/services/TrackPlayerService.ts)
  fires `POST /library/history` when an online track becomes active
  (fire-and-forget; silently no-ops when signed out).
- **[LikeButton.tsx](../app/src/components/player/LikeButton.tsx)** — heart in the
  expanded player for online tracks (occupies the previously-empty
  `heartPlaceholder` slot). Local-file favoriting is unchanged.

## Design decisions

- **Two library stores, by design.** Local (`libraryStore`) owns device files and
  reconciles against scans. Cloud (`cloudLibraryStore`) owns online videoIds.
  They never cross-contaminate.
- **Optimistic likes** — instant UI, background network, rollback on error.
- **Online history only.** Local playback still updates local recently-played /
  play-counts; online playback records to Supabase. No double-counting.

## Verified during build
- Backend boots with all Phase-3 routers (27 API routes total).
- `/library/liked` and `/playlist` return `AUTH_REQUIRED` without a token, in the
  correct envelope.
- App typechecks clean — zero errors in any Phase-3 file.

## Not yet wired (optional follow-ups)
- A "Liked Songs" / "Cloud Playlists" section in the Library tab UI (the data +
  store are ready; only the screen wiring remains).
- "Add to playlist" sheet for online songs (endpoint + store method exist).
- A live Supabase round-trip test — needs real credentials + the SQL migration
  applied. The sandbox here blocks executing code that reads `.env` secrets, so
  run it yourself per PHASE2_SETUP.md once signed in:
  search → play (history appears in `listening_history`), tap heart (row in
  `liked_songs`).
