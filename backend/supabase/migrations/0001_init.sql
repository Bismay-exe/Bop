-- ============================================================================
-- BOP Music — Phase 2/3 schema (PRD §18)
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query),
-- or via the Supabase MCP once authenticated.
--
-- Idempotent: safe to re-run. Creates all tables, RLS policies, indexes, and a
-- trigger that auto-creates a public.users row on signup (so a profile exists
-- even before the app calls POST /auth/sync).
-- ============================================================================

-- ─── 18.1 users ─────────────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth.users row appears (OAuth signup).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 18.2 liked_songs (Phase 3) ─────────────────────────────────────────────
create table if not exists public.liked_songs (
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

drop policy if exists "Users manage own liked songs" on public.liked_songs;
create policy "Users manage own liked songs"
  on public.liked_songs for all using (auth.uid() = user_id);

create index if not exists idx_liked_songs_user_id on public.liked_songs(user_id);
create index if not exists idx_liked_songs_liked_at on public.liked_songs(liked_at desc);

-- ─── 18.3 playlists (Phase 3) ───────────────────────────────────────────────
create table if not exists public.playlists (
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

drop policy if exists "Users manage own playlists" on public.playlists;
create policy "Users manage own playlists"
  on public.playlists for all using (auth.uid() = user_id);

drop policy if exists "Anyone can view public playlists" on public.playlists;
create policy "Anyone can view public playlists"
  on public.playlists for select using (is_public = true);

-- ─── 18.4 playlist_songs (Phase 3) ──────────────────────────────────────────
create table if not exists public.playlist_songs (
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

drop policy if exists "Users manage own playlist songs" on public.playlist_songs;
create policy "Users manage own playlist songs"
  on public.playlist_songs for all using (auth.uid() = user_id);

create index if not exists idx_playlist_songs_playlist_id on public.playlist_songs(playlist_id);
create index if not exists idx_playlist_songs_position on public.playlist_songs(playlist_id, position);

-- ─── 18.5 listening_history (Phase 3) ───────────────────────────────────────
create table if not exists public.listening_history (
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

drop policy if exists "Users manage own history" on public.listening_history;
create policy "Users manage own history"
  on public.listening_history for all using (auth.uid() = user_id);

create index if not exists idx_history_user_id on public.listening_history(user_id);
create index if not exists idx_history_played_at on public.listening_history(played_at desc);
