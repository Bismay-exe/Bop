import { CachedSong } from './media';

export interface Song extends CachedSong {
  queueId?: string; // Sometimes needed by TrackPlayer
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[]; // References Song.id ONLY
  createdAt: number;
  updatedAt: number;
}

export interface QueueItem extends Song {
  queueId: string; // uuid — unique per slot
}

export type RepeatMode = 'off' | 'track' | 'queue';
export type PlaybackState =
  | 'playing'
  | 'paused'
  | 'loading'
  | 'stopped'
  | 'error';

export interface PlaybackSnapshot {
  queueSongIds: string[]; // Ordered list of Song.id
  queueIndex: number;
  progressSeconds: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  savedAt: number; // Timestamp
}

export * from './media';
