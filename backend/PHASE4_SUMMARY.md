# Phase 4 — Harden & Deploy: Summary

## Done (code)
- **Full rate limiting (PRD §20)** — `_rate_limit_mw` in `main.py` applies per-IP
  limits by path prefix via `enforce_path_limit` in
  [middleware/rate_limit.py](app/middleware/rate_limit.py):
  search 60/min, explore 60, recommendations 60, auth/sync 5, library 120,
  playlist 60. Returns `RATE_LIMITED` (429) in the standard envelope.
- **Stream tiered limit** (already in place) — per-user 30/min, per-IP fallback.
- **Stream daily quota** — `enforce_stream_quota` → `QUOTA_EXCEEDED` (429).
  Configurable via `STREAM_DAILY_QUOTA` (default 1000; 0 disables).
- **Error codes** standardised (PRD §21) — done since Phase 1.
- **Request ID tracing** end-to-end — done since Phase 1 (`X-Request-ID`).

## Deploy (Railway)
1. Push repo; New Project → deploy `backend/` (Dockerfile has ffmpeg).
2. Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
   `SUPABASE_ANON_KEY`, `ENVIRONMENT=production`, `CORS_ORIGINS=...`,
   `LOG_FORMAT=json`.
3. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` · Health: `/health`.
4. App `EXPO_PUBLIC_API_URL=https://<railway>/api/v1`.

## Quick verification to run yourself
- Boot locally, hit `/api/v1/search?q=test` 61× in a minute → 61st returns
  `{"error":{"code":"RATE_LIMITED",...}}` (HTTP 429).
- Smoke-test all endpoints from the device once deployed (PRD §26 Phase 4).

## P5/P6/P7/P9 reminders (deferred by design)
In-memory rate limit + quota + TTLCache are single-instance. Multi-instance
scaling → move counters/cache to Redis (the `_hit` / `enforce_*` boundaries are
the swap points). No Celery/log-sampling yet. Same stance as documented earlier.
