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
  dateAdded: number;
}

export type QueueTaskType = 'METADATA' | 'ARTWORK';

export interface QueueTask {
  id: string; // Unique task ID (usually tied to song ID)
  type: QueueTaskType;
  execute: () => Promise<void>;
  cancel: () => void;
  priority: number; // 0 = highest, 100 = lowest
}
