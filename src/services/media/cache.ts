import { MMKV, createMMKV } from 'react-native-mmkv';
import { CachedSong } from '../../types/media';

/**
 * MMKV Storage instance specific to the media pipeline.
 */
const storage = createMMKV({
  id: 'media-repository-cache',
});

const CACHE_KEYS = {
  SONGS: 'media.songs.all',
  LAST_SYNC: 'media.sync.last_timestamp',
};

/**
 * Repository Abstraction Layer.
 * We completely decouple the business logic from MMKV so that if we later
 * migrate to SQLite (e.g. for search indexing or relational queries on 20k+ songs),
 * the interface remains exactly the same.
 */
export const MediaCache = {
  /**
   * Loads all cached songs instantaneously via JSI.
   */
  getAllSongs: (): CachedSong[] => {
    try {
      const json = storage.getString(CACHE_KEYS.SONGS);
      if (json) {
        return JSON.parse(json) as CachedSong[];
      }
    } catch (error) {
      console.error('[MediaCache] Failed to read songs from MMKV', error);
    }
    return [];
  },

  /**
   * Persists all songs. 
   * Note: If library size exceeds ~10k songs, JSON stringification might drop a few frames.
   * This is where a future SQLite migration would be triggered.
   */
  saveAllSongs: (songs: CachedSong[]): void => {
    try {
      storage.set(CACHE_KEYS.SONGS, JSON.stringify(songs));
    } catch (error) {
      console.error('[MediaCache] Failed to save songs to MMKV', error);
    }
  },

  /**
   * Gets a single song by ID.
   */
  getSong: (id: string): CachedSong | null => {
    const songs = MediaCache.getAllSongs();
    return songs.find((s) => s.id === id) || null;
  },

  /**
   * Updates a specific song's metadata/artwork cache.
   */
  updateSong: (id: string, updates: Partial<CachedSong>): void => {
    const songs = MediaCache.getAllSongs();
    const index = songs.findIndex((s) => s.id === id);
    if (index !== -1) {
      songs[index] = { ...songs[index], ...updates };
      MediaCache.saveAllSongs(songs);
    }
  },

  /**
   * Deletes songs by their IDs.
   */
  removeSongs: (ids: string[]): void => {
    const songs = MediaCache.getAllSongs();
    const idSet = new Set(ids);
    const filtered = songs.filter(s => !idSet.has(s.id));
    MediaCache.saveAllSongs(filtered);
  },

  /**
   * Tracks the last time a full/incremental sync was performed.
   */
  getLastSyncTimestamp: (): number => {
    return storage.getNumber(CACHE_KEYS.LAST_SYNC) || 0;
  },

  setLastSyncTimestamp: (timestamp: number): void => {
    storage.set(CACHE_KEYS.LAST_SYNC, timestamp);
  },
  
  /**
   * Entirely wipes the media cache (useful for versioned lazy migration resets).
   */
  clearAll: (): void => {
    storage.remove(CACHE_KEYS.SONGS);
    storage.remove(CACHE_KEYS.LAST_SYNC);
  }
};
