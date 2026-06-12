# Phase 2 — Auth & Profile: Setup Guide

Code for Phase 2 is complete. A few steps require your dashboard/terminal access
(I can't drive browser OAuth or apply DB schema from here). Do these in order.

---

## 1. Apply the database schema

Open **Supabase Dashboard → SQL Editor → New query**, paste the contents of
[`backend/supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
and run it. It is idempotent (safe to re-run).

This creates all 5 tables (`users`, `liked_songs`, `playlists`,
`playlist_songs`, `listening_history`), their RLS policies + indexes, and a
trigger that auto-creates a `public.users` row on signup.

> Alternatively, once you authenticate the Supabase MCP server (`claude /mcp` in
> a normal terminal), I can apply it via MCP in a later turn.

## 2. Enable Google OAuth in Supabase

1. **Dashboard → Authentication → Providers → Google → Enable.**
2. Create a Google OAuth client at <https://console.cloud.google.com> (APIs &
   Services → Credentials → OAuth client ID → **Web application**).
3. Add this **Authorized redirect URI** to the Google client:
   `https://jqamxnplyvtjxwztumma.supabase.co/auth/v1/callback`
4. Paste the Google **Client ID** and **Client Secret** into the Supabase Google
   provider config and save.

## 3. Register the app's deep-link redirect

**Dashboard → Authentication → URL Configuration → Redirect URLs**, add:

```
bop://auth-callback
exp://localhost:8081        # Expo Go dev (optional)
```

The app derives this from `scheme: "bop"` in `app.json` (already set) via
`AuthSession.makeRedirectUri({ scheme: 'bop', path: 'auth-callback' })`.

## 4. Fill environment variables

### Backend — `backend/.env`
You already have these set. Confirm they're the **real** values:
```
SUPABASE_URL=https://jqamxnplyvtjxwztumma.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role key>   # Settings → API
SUPABASE_JWT_SECRET=<JWT secret>               # Settings → API → JWT (legacy HS256)
```
> The backend auto-detects the token signing method. If your project uses the
> newer **asymmetric** keys (ES256/RS256), `SUPABASE_JWT_SECRET` is not used —
> verification happens via the public JWKS endpoint automatically. No config
> change needed either way.

### App — `app/.env` (copy from `app/.env.example`)
```
EXPO_PUBLIC_API_URL=http://<LAN-IP>:8000/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://jqamxnplyvtjxwztumma.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>       # Settings → API (public key)
```

## 5. Install the app auth packages

The sandbox blocked this during the build — run it yourself:
```bash
cd app
npx expo install @supabase/supabase-js expo-secure-store expo-auth-session expo-crypto
```
This clears the three "Cannot find module" TypeScript errors.

## 6. Test the flow

1. Start the backend: `cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload`
2. Start the app, go to **Settings → Account → Sign in with Google**.
3. Complete the browser flow → you should land back in the app, signed in, with
   your name/avatar shown.
4. Verify the backend received the sync: a row should appear in
   `public.users`, and `GET /api/v1/user/profile` with your token returns it.

---

## What changed (code reference)

**Backend**
- `app/services/auth_service.py` — Supabase JWT verification, HS256 **and**
  asymmetric (JWKS) auto-detected from the token header.
- `app/dependencies.py` — `get_current_user` (required) / `get_optional_user`.
- `app/services/supabase_service.py` — user upsert / profile read+update
  (service-role client; RLS still protects direct access).
- `app/routers/auth.py` — `POST /auth/sync`.
- `app/routers/user.py` — `GET/PATCH /user/profile`.
- `app/middleware/rate_limit.py` — tiered `/stream` limiting (per-user 30/min,
  per-IP fallback). `/stream` stays open but now identifies the user for the
  higher limit.

**App**
- `src/services/supabase.ts` — Supabase client, SecureStore-backed sessions.
- `src/store/authStore.ts` — session/user/profile, Google OAuth web flow,
  `getAccessToken()` for the API client.
- `src/services/api/client.ts` — now attaches `Authorization: Bearer <token>`.
- `src/services/api/endpoints.ts` — `syncProfile`, `getUserProfile`,
  `updateUserProfile`.
- `src/components/settings/AccountSection.tsx` — sign in/out + profile UI.
- `src/app/(tabs)/settings/index.tsx` — Account section added at top.
- `src/app/_layout.tsx` — restores the session on app start.

## Verified during build
- Backend boots with all Phase-2 routers; `/auth/sync` and `/user/profile`
  return `AUTH_REQUIRED` / `AUTH_INVALID` (correct envelope) without a token.
- JWT verifier unit-checked: valid HS256 token decodes to the user; expired
  token is rejected with `AUTH_INVALID`.
- All Phase-2 backend modules compile.

## Security notes
- The **anon key** is a public client key — safe in the app bundle. The
  **service-role key** and **JWT secret** live only in the backend, never the app.
- The backend uses the service-role key but scopes every DB write to the
  `user_id` from the verified JWT, so it can't act outside the authenticated user.
