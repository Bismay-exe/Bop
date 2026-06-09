import { normalizeTitle, normalizeArtist } from './normalizeMetadata';
import { getCachedLyrics, setCachedLyrics, LyricsPayload } from './lyricsCache';
import { parsePlainLyrics, parseSyncedLyrics } from './lyricsParser';

// NOTE: 'User-Agent' is a forbidden header per the Fetch spec and is blocked by
// Android's OkHttp layer in release builds, causing fetch() to fail silently.
// We use 'Lrclib-Client' instead — a non-restricted header lrclib.net accepts
// for app identification (same purpose, no platform restrictions).
const LRCLIB_CLIENT_HEADER = { 'Lrclib-Client': 'BopMusicApp/1.0.0 (https://github.com/bismay-exe/bop)' };

const inFlightRequests = new Map<string, Promise<LyricsPayload | null>>();

export async function fetchLyrics(artist: string, title: string, signal?: AbortSignal): Promise<LyricsPayload | null> {
  // 1. Normalize Metadata
  const normArtist = normalizeArtist(artist);
  const normTitle = normalizeTitle(title);

  if (!normArtist || !normTitle) return null;

  const requestKey = `${normArtist}_${normTitle}`;

  // 2. Check Cache
  const cached = getCachedLyrics(normArtist, normTitle);
  if (cached) return cached;

  // 3. Request Deduplication
  if (inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey)!;
  }

  // 4. Fetch Strategy with Timeout and Cancellation
  const fetchPromise = (async () => {
    try {
      const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(normArtist)}&track_name=${encodeURIComponent(normTitle)}`;
      
      const controller = new AbortController();
      
      const onAbort = () => controller.abort();
      if (signal) {
        if (signal.aborted) return null;
        signal.addEventListener('abort', onAbort);
      }

      // Timeout policy: 10 seconds max
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        let data: any = null;
        let response = await fetch(url, { 
          signal: controller.signal,
          headers: LRCLIB_CLIENT_HEADER,
        });
        
        if (response.ok) {
          data = await response.json();
        } else if (response.status === 404) {
          // Fallback to fuzzy search if exact match fails
          const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(normArtist + ' ' + normTitle)}`;
          const searchResponse = await fetch(searchUrl, { 
            signal: controller.signal,
            headers: LRCLIB_CLIENT_HEADER,
          });
          
          if (searchResponse.ok) {
            const searchResults = await searchResponse.json();
            if (Array.isArray(searchResults) && searchResults.length > 0) {
              // Pick the first one that actually has lyrics
              data = searchResults.find(r => r.syncedLyrics || r.plainLyrics);
            }
          }
        }

        if (!data) {
          return null;
        }
        
        const plainLyrics = data.plainLyrics ? parsePlainLyrics(data.plainLyrics) : undefined;
        const syncedLyrics = data.syncedLyrics ? parseSyncedLyrics(data.syncedLyrics) : undefined;

        if (!plainLyrics && !syncedLyrics) {
          return null;
        }

        // Cache the successful result
        setCachedLyrics(normArtist, normTitle, plainLyrics, syncedLyrics);
        return getCachedLyrics(normArtist, normTitle); 
      } finally {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onAbort);
      }
    } catch (e: any) {
      const isAbort = e.name === 'AbortError' || (e.message && (e.message.includes('canceled') || e.message.includes('aborted')));
      if (!isAbort) {
        console.warn('[fetchLyrics] Network or parse error:', e);
      }
      return null;
    } finally {
      inFlightRequests.delete(requestKey);
    }
  })();

  inFlightRequests.set(requestKey, fetchPromise);
  return fetchPromise;
}
