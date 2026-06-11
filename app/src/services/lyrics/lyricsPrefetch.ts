import { fetchLyrics } from './fetchLyrics';
import { usePlayerStore } from '../../store/playerStore';

let currentAbortController: AbortController | null = null;
let currentPrefetchTrackId: string | null = null;

/**
 * Aggressively prefetches lyrics for the currently playing track in the background.
 * Cancels any ongoing fetches if the track changes rapidly.
 */
export async function prefetchLyricsForTrack(artist: string | undefined, title: string | undefined, trackId: string) {
  if (!artist || !title || artist === 'Unknown' || title === 'Unknown') {
    usePlayerStore.getState().setOnlineLyrics(null);
    return;
  }

  // Cancel previous fetch if we skip quickly
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }

  currentPrefetchTrackId = trackId;
  currentAbortController = new AbortController();

  usePlayerStore.getState().setIsFetchingLyrics(true);
  const payload = await fetchLyrics(artist, title, currentAbortController.signal);
  
  // Stale-request protection: ensure the track hasn't changed before committing result to UI store
  if (currentPrefetchTrackId !== trackId) {
    return;
  }

  if (payload) {
    usePlayerStore.getState().setOnlineLyrics(payload);
  } else {
    // Elegant fallback handled by UI when onlineLyrics is null
    usePlayerStore.getState().setOnlineLyrics(null);
  }
}
