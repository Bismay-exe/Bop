export type LyricsLine = {
  text: string;
  timestamp?: number;
  isSectionHeader?: boolean;
};

export interface RawAsset {
  id: string;
  uri: string;
  filename: string;
  duration: number;
  modificationTime: number;
  albumId?: string; // Sometimes provided natively by Expo
}

export interface ParsedMetadata {
  title: string;
  artist: string;
  album: string;
  hasArtwork: boolean;
  artworkHash?: string; // Hash used for cache invalidation
  lyrics?: LyricsLine[];
  genre?: string;
  year?: number;
  language?: string;
  mood?: string;
  folder?: string;
}

export interface ArtworkCacheEntry {
  songId: string;
  localFileUri: string; // file:// cache/artworks/...
  timestamp: number; // For eviction
}

export interface CachedSong {
  id: string;
  uri: string;
  filename: string;
  duration: number;
  modificationTime: number;
  title?: string;
  artist?: string;
  album?: string;
  artwork?: string; // URL to the cached artwork file
  lyrics?: LyricsLine[];
  genre?: string;
  year?: number;
  language?: string;
  mood?: string;
  folder?: string;
  dateAdded: number;

  // ─── Online streaming (Phase 1) ──────────────────────────────────────────
  // 'local' = scanned device file (default for all existing data).
  // 'online' = YouTube Music track fetched from the backend.
  source?: 'local' | 'online';
  videoId?: string;          // YouTube videoId (online only; equals `id`)
  thumbnailUrl?: string;     // remote artwork URL (online only)
  streamUrl?: string;        // resolved stream URL (online; filled lazily, never persisted)
  streamExpiresAt?: number;  // epoch ms when streamUrl expires (online)
}

export type QueueTaskType = 'METADATA' | 'ARTWORK';

export interface QueueTask {
  id: string; // Unique task ID (usually tied to song ID)
  type: QueueTaskType;
  execute: () => Promise<void>;
  cancel: () => void;
  priority: number; // 0 = highest, 100 = lowest
}
