import { createMMKV } from 'react-native-mmkv';
import { LyricsLine } from '../../types/media';

export const lyricsStorage = createMMKV({
  id: 'lyrics-cache',
});

const CACHE_VERSION = 1;

export type LyricsPayload = {
  plainLyrics?: LyricsLine[];
  syncedLyrics?: LyricsLine[];
  source: 'cache' | 'lrclib';
  fetchedAt: number;
  version: number;
};

function getCacheKey(artist: string, title: string): string {
  // Use normalized lowercase strings for consistent keys
  const safeArtist = artist.toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `lyrics_${safeArtist}_${safeTitle}`;
}

export function getCachedLyrics(artist: string, title: string): LyricsPayload | null {
  const key = getCacheKey(artist, title);
  const json = lyricsStorage.getString(key);
  
  if (!json) return null;

  try {
    const payload: LyricsPayload = JSON.parse(json);
    // Future proofing: if we update the parser significantly, we can bump CACHE_VERSION
    // and ignore old cache entries to force a refetch.
    if (payload.version !== CACHE_VERSION) {
      return null;
    }
    return { ...payload, source: 'cache' };
  } catch (e) {
    console.warn('[lyricsCache] Failed to parse cached lyrics', e);
    return null;
  }
}

export function setCachedLyrics(artist: string, title: string, plainLyrics?: LyricsLine[], syncedLyrics?: LyricsLine[]) {
  const key = getCacheKey(artist, title);
  const payload: LyricsPayload = {
    plainLyrics,
    syncedLyrics,
    source: 'cache',
    fetchedAt: Date.now(),
    version: CACHE_VERSION,
  };
  
  lyricsStorage.set(key, JSON.stringify(payload));
}
