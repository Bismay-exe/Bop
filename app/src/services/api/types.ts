/**
 * API types — mirror the backend's JSON shapes (camelCase) from the FastAPI
 * `{ success, data, error }` envelope. See backend/app/models/schemas.py.
 */

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  requestId: string;
}

export interface ApiSong {
  videoId: string | null;
  title: string;
  artist: string | null;
  album: string | null;
  duration: string | null;
  duration_seconds: number | null;
  thumbnail: string | null;
  isExplicit: boolean;
}

export interface ApiArtistRef {
  artistId: string | null;
  name: string;
  thumbnail: string | null;
}

export interface ApiAlbumRef {
  browseId: string | null;
  title: string;
  artist: string | null;
  year: string | null;
  thumbnail: string | null;
}

export interface SearchTopResult {
  query: string;
  type: 'top';
  songs: ApiSong[];
  artists: ApiArtistRef[];
  albums: ApiAlbumRef[];
}

export interface SearchListResult {
  query: string;
  type: string;
  results: ApiSong[];
}

export interface StreamInfo {
  videoId: string;
  streamUrl: string;
  format: string;
  bitrate: number | null;
  duration_seconds: number | null;
  expiresAt: string | null;
}

export interface RadioResult {
  radioId?: string;
  seedVideoId?: string;
  tracks: ApiSong[];
}

export interface TrendingResult {
  country: string;
  songs: ApiSong[];
}

export interface LyricsResult {
  videoId: string;
  lyrics: string | null;
  hasTimestamps: boolean;
  source: string | null;
}

export type SearchTab = 'top' | 'songs' | 'artists' | 'albums' | 'playlists' | 'videos';
