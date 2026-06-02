import { MMKV, createMMKV } from 'react-native-mmkv';
import { useLibraryStore } from '../store/libraryStore';
import { MediaCache } from './media/cache';
import TrackPlayer from 'react-native-track-player';
import { PlaybackSnapshot } from '../types';

const storage = createMMKV({
  id: 'library-storage'
});

export const STORAGE_KEYS = {
  PLAYLISTS: 'library:playlists',
  FAVORITES: 'library:favorites',
  RECENTLY_PLAYED: 'library:recently_played',
  PLAYBACK_SNAPSHOT: 'player:snapshot',
} as const;

// Keep async signature to avoid breaking existing imports/calls
export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = storage.getString(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error reading ${key} from MMKV:`, error);
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    storage.set(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to MMKV:`, error);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    storage.remove(key);
  } catch (error) {
    console.error(`Error removing ${key} from MMKV:`, error);
  }
}

export async function clearAll(): Promise<void> {
  try {
    storage.clearAll();
    MediaCache.clearAll();
  } catch (error) {
    console.error(`Error clearing MMKV storage:`, error);
  }
}

// Inject hydration and persistence into library store
useLibraryStore.setState({
  hydrate: async () => {
    // Songs are handled by the new MediaCache abstraction synchronously!
    const songs = MediaCache.getAllSongs();
    const lastScanned = MediaCache.getLastSyncTimestamp();

    const [playlists, favoritesArray, recentlyPlayed] = await Promise.all([
      getItem<any[]>(STORAGE_KEYS.PLAYLISTS),
      getItem<string[]>(STORAGE_KEYS.FAVORITES),
      getItem<string[]>(STORAGE_KEYS.RECENTLY_PLAYED),
    ]);

    useLibraryStore.setState({
      songs: songs ?? [],
      playlists: playlists ?? [],
      favorites: new Set(favoritesArray ?? []),
      recentlyPlayed: recentlyPlayed ?? [],
      lastScanned: lastScanned || null,
    });
  },
  persist: async () => {
    const state = useLibraryStore.getState();
    
    // Songs are auto-persisted via MediaCache when scanned or JIT updated
    // So we don't persist them here anymore, preventing double-writes.
    
    await Promise.all([
      setItem(STORAGE_KEYS.PLAYLISTS, state.playlists),
      setItem(STORAGE_KEYS.FAVORITES, Array.from(state.favorites)),
      setItem(STORAGE_KEYS.RECENTLY_PLAYED, state.recentlyPlayed),
    ]);
  }
});


export async function writePlaybackSnapshot(): Promise<void> {
  try {
    const queue = await TrackPlayer.getQueue();
    if (queue.length === 0) return; 
    
    const index = await TrackPlayer.getActiveTrackIndex() || 0;
    const progress = await TrackPlayer.getProgress();
    const { usePlayerStore } = await import('../store/playerStore');
    const state = usePlayerStore.getState();

    const snapshot: PlaybackSnapshot = {
      queueSongIds: queue.map(t => t.id),
      queueIndex: index,
      progressSeconds: progress.position,
      repeatMode: state.repeatMode,
      shuffleEnabled: state.shuffleEnabled,
      savedAt: Date.now(),
    };

    await setItem(STORAGE_KEYS.PLAYBACK_SNAPSHOT, snapshot);
  } catch (error) {
    console.error('Failed to write playback snapshot', error);
  }
}

export async function restorePlaybackSnapshot(): Promise<void> {
  try {
    const snapshot = await getItem<PlaybackSnapshot>(STORAGE_KEYS.PLAYBACK_SNAPSHOT);
    if (!snapshot) return;

    if (Date.now() - snapshot.savedAt > 7 * 24 * 60 * 60 * 1000) {
      await removeItem(STORAGE_KEYS.PLAYBACK_SNAPSHOT);
      return;
    }

    const { replaceQueueAndPlay } = await import('./TrackPlayerService');
    const allSongs = useLibraryStore.getState().songs;

    const restoredSongs = snapshot.queueSongIds
      .map(id => allSongs.find(s => s.id === id))
      .filter(Boolean) as any[];

    if (restoredSongs.length === 0) return;

    const validIndex = Math.min(Math.max(0, snapshot.queueIndex), restoredSongs.length - 1);

    await replaceQueueAndPlay(restoredSongs, validIndex);
    await TrackPlayer.pause();
    
    if (snapshot.progressSeconds > 0) {
      await TrackPlayer.seekTo(snapshot.progressSeconds);
    }
  } catch (error) {
    console.error('Failed to restore playback snapshot', error);
  }
}
