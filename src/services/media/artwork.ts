import { File, Directory, Paths } from 'expo-file-system';
import { ensureArtworkCacheDirectory } from './uri';

const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Fast Uint8Array to Base64 encoder.
 * Used to convert raw ID3 picture bytes into a format we can write to disk.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let base64 = '';
  for (let i = 0; i < bytes.length; i += 3) {
    base64 += b64chars[bytes[i] >> 2];
    base64 += b64chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += b64chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += b64chars[bytes[i + 2] & 63];
  }
  if (bytes.length % 3 === 2) {
    base64 = base64.substring(0, base64.length - 1) + '=';
  } else if (bytes.length % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2) + '==';
  }
  return base64;
}

/**
 * Gets the versioned file path for a song's artwork.
 * By including the modificationTime, we prevent stale cache bugs if the audio file is updated.
 */
export function getArtworkFilePath(songId: string, modificationTime: number): string {
  // Use the new Paths API for Expo 56+
  return `${Paths.cache.uri}artworks/${songId}_${modificationTime}.jpg`;
}

/**
 * Writes the raw ID3 picture data to disk.
 * Returns the file:// URI of the cached image.
 * 
 * Uses the new Expo 56+ File API instead of deprecated legacy methods.
 */
export async function cacheArtworkToDisk(
  songId: string,
  modificationTime: number,
  pictureData: Uint8Array
): Promise<string> {
  await ensureArtworkCacheDirectory();
  
  const filePath = getArtworkFilePath(songId, modificationTime);
  const file = new File(filePath);
  
  // If we already cached this exact version of the artwork, just return it
  if (file.exists) {
    return filePath;
  }
  
  try {
    const base64 = bytesToBase64(pictureData);
    // Write base64-encoded image data using the new File API
    file.write(base64, { encoding: 'base64' });
    
    // Future Optimization Note: If memory becomes an issue on low-end devices due to
    // 3000x3000 embedded PNGs, we should invoke `expo-image-manipulator` here to 
    // downsample to 500x500 before saving to disk.
    
    return filePath;
  } catch (error) {
    console.error(`[Artwork] Failed to write artwork to disk for song ${songId}`, error);
    throw error;
  }
}

/**
 * Sweeps the cache directory to remove orphaned or stale artwork files.
 * Useful for memory budgeting and preventing unbounded storage growth.
 * 
 * Uses the new Expo 56+ Directory API instead of deprecated legacy methods.
 */
export async function evictStaleArtwork(activeSongIds: string[]): Promise<void> {
  try {
    const dir = new Directory(Paths.cache, 'artworks');
    if (!dir.exists) return;
    
    const entries = dir.list();
    
    // simple eviction: if file doesn't start with an active song ID, delete it
    // In a fully scaled app, you'd sort by LRU or size limits.
    const activePrefixes = new Set(activeSongIds);
    
    for (const entry of entries) {
      // entry is a File or Directory object; get just the filename
      const filename = entry.uri.split('/').pop() || '';
      const songId = filename.split('_')[0];
      if (!activePrefixes.has(songId)) {
        if (entry instanceof File) {
          entry.delete();
        }
      }
    }
  } catch (error) {
    console.log('[Artwork] Eviction failed (non-fatal)', error);
  }
}
