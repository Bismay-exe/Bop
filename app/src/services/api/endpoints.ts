/**
 * Typed endpoint wrappers + ApiSong → Song mapping.
 *
 * The mapper is the bridge between the backend's online tracks and the app's
 * existing `Song` model. Crucially it sets:
 *   - source: 'online'
 *   - id = videoId (so all existing keyExtractors / lookups work)
 *   - artwork = thumbnail URL (so SongCard/AlbumCard render unchanged; expo-image
 *     handles remote URLs natively)
 *   - title set (so SongCard does NOT try local metadata extraction)
 *   - uri = '' (stream URL is resolved lazily at play time, never here)
 */
import { Song } from '../../types';
import { apiRequest, apiConfig } from './client';
import {
  ApiSong,
  LyricsResult,
  RadioResult,
  SearchListResult,
  SearchTab,
  SearchTopResult,
  StreamInfo,
  TrendingResult,
} from './types';

export function mapApiSongToSong(api: ApiSong): Song {
  const id = api.videoId ?? `yt_${api.title}_${api.artist ?? ''}`;
  return {
    id,
    source: 'online',
    videoId: api.videoId ?? undefined,
    uri: '', // resolved lazily via /stream when this track is about to play
    filename: api.title,
    duration: api.duration_seconds ?? 0,
    modificationTime: 0,
    title: api.title,
    artist: api.artist ?? 'Unknown Artist',
    album: api.album ?? undefined,
    artwork: api.thumbnail ?? undefined,
    thumbnailUrl: api.thumbnail ?? undefined,
    dateAdded: 0,
  };
}

export function mapApiSongs(items: ApiSong[]): Song[] {
  // Only keep playable tracks (must have a videoId).
  return items.filter((s) => s.videoId).map(mapApiSongToSong);
}

// ─── Search ─────────────────────────────────────────────────────────────────
export async function searchTop(query: string, signal?: AbortSignal): Promise<SearchTopResult> {
  return apiRequest<SearchTopResult>(
    `/search?q=${encodeURIComponent(query)}&type=top`,
    { signal },
  );
}

export async function searchTab(
  query: string,
  tab: SearchTab,
  limit = 20,
  signal?: AbortSignal,
): Promise<Song[]> {
  if (tab === 'top') {
    const res = await searchTop(query, signal);
    return mapApiSongs(res.songs);
  }
  const res = await apiRequest<SearchListResult>(
    `/search?q=${encodeURIComponent(query)}&type=${tab}&limit=${limit}`,
    { signal },
  );
  return mapApiSongs(res.results ?? []);
}

// ─── Stream (never cached; generous timeout for yt-dlp) ──────────────────────
export async function getStreamInfo(videoId: string): Promise<StreamInfo> {
  return apiRequest<StreamInfo>(`/stream/${videoId}`, {
    timeoutMs: apiConfig.streamTimeoutMs,
    dedupe: true, // collapse duplicate concurrent requests for the same track
  });
}

// ─── Explore ─────────────────────────────────────────────────────────────────
export async function getTrending(country?: string, limit = 20): Promise<Song[]> {
  const q = country ? `?country=${country}&limit=${limit}` : `?limit=${limit}`;
  const res = await apiRequest<TrendingResult>(`/explore/trending${q}`);
  return mapApiSongs(res.songs ?? []);
}

// ─── Recommendations ─────────────────────────────────────────────────────────
export async function getRadio(videoId: string): Promise<Song[]> {
  const res = await apiRequest<RadioResult>(`/recommendations/radio/${videoId}`);
  return mapApiSongs(res.tracks ?? []);
}

export async function getRelated(videoId: string): Promise<Song[]> {
  const res = await apiRequest<RadioResult>(`/recommendations/related/${videoId}`);
  return mapApiSongs(res.tracks ?? []);
}

// ─── Lyrics ──────────────────────────────────────────────────────────────────
export async function getOnlineLyrics(videoId: string): Promise<LyricsResult> {
  return apiRequest<LyricsResult>(`/lyrics/${videoId}`);
}

// ─── Auth / Profile (Phase 2) ────────────────────────────────────────────────
export interface BackendProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

/** Upsert the backend profile from the JWT. Called once after login. */
export async function syncProfile(): Promise<BackendProfile> {
  return apiRequest<BackendProfile>('/auth/sync', { method: 'POST', dedupe: false });
}

export async function getUserProfile(): Promise<BackendProfile> {
  return apiRequest<BackendProfile>('/user/profile');
}

export async function updateUserProfile(
  fields: { display_name?: string; avatar_url?: string },
): Promise<BackendProfile> {
  return apiRequest<BackendProfile>('/user/profile', {
    method: 'PATCH',
    body: fields,
    dedupe: false,
  });
}

// ─── Library: liked + history (Phase 3) ──────────────────────────────────────
export interface CloudSong {
  id?: string;
  video_id: string;
  title: string;
  artist: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  liked_at?: string;
  played_at?: string;
}

export interface SongMeta {
  title: string;
  artist: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
}

/** Map a Song (online) into the meta payload the backend expects. */
export function songToMeta(song: Song): SongMeta {
  return {
    title: song.title ?? 'Unknown',
    artist: song.artist ?? 'Unknown',
    thumbnail_url: song.thumbnailUrl ?? song.artwork ?? null,
    duration_seconds: song.duration || null,
  };
}

/** Map a CloudSong row back into the app's Song model (source: 'online'). */
export function cloudSongToSong(c: CloudSong): Song {
  return {
    id: c.video_id,
    source: 'online',
    videoId: c.video_id,
    uri: '',
    filename: c.title,
    duration: c.duration_seconds ?? 0,
    modificationTime: 0,
    title: c.title,
    artist: c.artist,
    artwork: c.thumbnail_url ?? undefined,
    thumbnailUrl: c.thumbnail_url ?? undefined,
    dateAdded: 0,
  };
}

export async function getLikedSongs(limit = 50, offset = 0): Promise<CloudSong[]> {
  const res = await apiRequest<{ results: CloudSong[] }>(
    `/library/liked?limit=${limit}&offset=${offset}`,
  );
  return res.results ?? [];
}

export async function likeSong(videoId: string, meta: SongMeta): Promise<void> {
  await apiRequest(`/library/liked/${videoId}`, { method: 'POST', body: meta, dedupe: false });
}

export async function unlikeSong(videoId: string): Promise<void> {
  await apiRequest(`/library/liked/${videoId}`, { method: 'DELETE', dedupe: false });
}

export async function getLikedStatus(videoId: string): Promise<boolean> {
  const res = await apiRequest<{ liked: boolean }>(`/library/liked/${videoId}/status`);
  return res.liked;
}

export async function getHistory(limit = 30, offset = 0): Promise<CloudSong[]> {
  const res = await apiRequest<{ results: CloudSong[] }>(
    `/library/history?limit=${limit}&offset=${offset}`,
  );
  return res.results ?? [];
}

export async function recordHistory(meta: {
  video_id: string;
  title: string;
  artist: string;
  thumbnail_url?: string | null;
  play_duration_seconds?: number;
}): Promise<void> {
  await apiRequest('/library/history', { method: 'POST', body: meta, dedupe: false });
}

export async function clearHistory(): Promise<void> {
  await apiRequest('/library/history', { method: 'DELETE', dedupe: false });
}

// ─── Playlists (Phase 3) ──────────────────────────────────────────────────────
export interface CloudPlaylist {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  is_public: boolean;
  song_count: number;
  created_at?: string;
  updated_at?: string;
  songs?: CloudSong[];
}

export async function getPlaylists(): Promise<CloudPlaylist[]> {
  const res = await apiRequest<{ results: CloudPlaylist[] }>('/playlist');
  return res.results ?? [];
}

export async function createPlaylist(
  name: string,
  description?: string,
  isPublic = false,
): Promise<CloudPlaylist> {
  return apiRequest<CloudPlaylist>('/playlist', {
    method: 'POST',
    body: { name, description, is_public: isPublic },
    dedupe: false,
  });
}

export async function getPlaylist(playlistId: string): Promise<CloudPlaylist> {
  return apiRequest<CloudPlaylist>(`/playlist/${playlistId}`);
}

export async function updatePlaylist(
  playlistId: string,
  fields: { name?: string; description?: string; is_public?: boolean },
): Promise<CloudPlaylist> {
  return apiRequest<CloudPlaylist>(`/playlist/${playlistId}`, {
    method: 'PATCH',
    body: fields,
    dedupe: false,
  });
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  await apiRequest(`/playlist/${playlistId}`, { method: 'DELETE', dedupe: false });
}

export async function addSongToPlaylist(
  playlistId: string,
  videoId: string,
  meta: SongMeta,
): Promise<void> {
  await apiRequest(`/playlist/${playlistId}/songs`, {
    method: 'POST',
    body: { video_id: videoId, ...meta },
    dedupe: false,
  });
}

export async function removeSongFromPlaylist(playlistId: string, videoId: string): Promise<void> {
  await apiRequest(`/playlist/${playlistId}/songs/${videoId}`, { method: 'DELETE', dedupe: false });
}

export async function reorderPlaylistSong(
  playlistId: string,
  videoId: string,
  newPosition: number,
): Promise<void> {
  await apiRequest(`/playlist/${playlistId}/reorder`, {
    method: 'PATCH',
    body: { video_id: videoId, new_position: newPosition },
    dedupe: false,
  });
}
