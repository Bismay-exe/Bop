import * as MediaLibrary from 'expo-media-library/legacy';
import { CachedSong, RawAsset } from '../../types/media';
import { MediaCache } from './cache';
import { evictStaleArtwork } from './artwork';

const SUPPORTED_EXTENSIONS = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'];
const PAGE_SIZE = 100;
import { Directory, Paths } from 'expo-file-system';

export async function requestMediaPermissions(): Promise<'granted' | 'denied' | 'blocked'> {
  const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (!canAskAgain) return 'blocked';
  
  const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
  return newStatus === 'granted' ? 'granted' : 'denied';
}

/**
 * Super fast, incremental discovery phase.
 * Only pulls what's needed to build the initial list. Does not parse ID3.
 */
export async function syncMediaLibrary(
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<CachedSong[]> {
  const permission = await requestMediaPermissions();
  if (permission !== 'granted') {
    throw new Error('Permission not granted');
  }

  // 1. Get current cache state
  const cachedSongs = MediaCache.getAllSongs();
  const cachedMap = new Map<string, CachedSong>();
  cachedSongs.forEach(s => cachedMap.set(s.id, s));

  const artworkDir = new Directory(Paths.cache, 'artworks');
  let existingArtworks = new Set<string>();
  if (artworkDir.exists) {
    existingArtworks = new Set(artworkDir.list().map(f => f.uri.split('/').pop() || ''));
  }

  // 2. Fetch raw assets via pagination
  let hasNextPage = true;
  let after: string | undefined = undefined;
  const discoveredAssets: RawAsset[] = [];
  let fetchedCount = 0;
  let totalCount = 0;

  while (hasNextPage) {
    if (signal?.aborted) throw new Error('Scan aborted');

    const page = await MediaLibrary.getAssetsAsync({
      mediaType: 'audio',
      first: PAGE_SIZE,
      after: after,
    });

    totalCount = page.totalCount;

    for (const asset of page.assets) {
      const ext = asset.filename ? asset.filename.split('.').pop()?.toLowerCase() || '' : 'mp3';
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        discoveredAssets.push({
          id: asset.id,
          uri: asset.uri,
          filename: asset.filename,
          duration: asset.duration,
          modificationTime: asset.modificationTime,
          albumId: asset.albumId,
        });
      }
    }

    fetchedCount += page.assets.length;
    if (onProgress) {
      onProgress(fetchedCount, totalCount);
    }

    hasNextPage = page.hasNextPage;
    after = page.endCursor;
    
    // Yield to JS event loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // 3. Incremental Sync Logic (Added, Modified, Removed)
  const finalSongs: CachedSong[] = [];
  let hasChanges = false;
  
  const discoveredIds = new Set<string>();

  for (const asset of discoveredAssets) {
    discoveredIds.add(asset.id);
    const cached = cachedMap.get(asset.id);

    if (!cached) {
      // NEW FILE
      hasChanges = true;
      finalSongs.push({
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        duration: asset.duration,
        modificationTime: asset.modificationTime,
        dateAdded: Date.now(),
        // Note: title/artist/album/artwork are intentionally left undefined.
        // They will be populated JIT via metadata.ts when rendered.
      });
    } else if (cached.modificationTime !== asset.modificationTime) {
      // MODIFIED FILE
      hasChanges = true;
      finalSongs.push({
        ...cached,
        uri: asset.uri,
        filename: asset.filename,
        duration: asset.duration,
        modificationTime: asset.modificationTime,
        // Reset metadata so it triggers re-extraction on render
        title: undefined,
        artist: undefined,
        album: undefined,
        artwork: undefined,
      });
    } else {
      // UNCHANGED FILE
      const expectedArtworkFile = `${cached.id}_${cached.modificationTime}.jpg`;
      if (cached.title !== undefined && cached.artwork !== undefined && !existingArtworks.has(expectedArtworkFile)) {
        // Missing artwork file despite being cached! Reset it to force re-extraction.
        hasChanges = true;
        finalSongs.push({
          ...cached,
          title: undefined,
          artist: undefined,
          album: undefined,
          artwork: undefined,
        });
      } else {
        finalSongs.push(cached);
      }
    }
  }

  // Check for deleted files
  if (finalSongs.length !== cachedSongs.length) {
    hasChanges = true;
  }

  // 4. Save updates and sweep stale data
  if (hasChanges) {
    MediaCache.saveAllSongs(finalSongs);
    MediaCache.setLastSyncTimestamp(Date.now());
    
    // Fire-and-forget stale artwork eviction
    evictStaleArtwork(Array.from(discoveredIds)).catch(() => {});
  }

  if (onProgress && !signal?.aborted) {
    onProgress(totalCount, totalCount);
  }

  return finalSongs;
}
