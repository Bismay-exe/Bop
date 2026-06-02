import { File, Directory, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Centralized URI normalization layer.
 * Android storage URIs can be wildly inconsistent (file://, content://, ph://).
 * This layer ensures we always pass safe, expected URIs to downstream systems.
 */
export async function normalizeAudioUri(uri: string): Promise<string> {
  if (!uri) return uri;

  let normalizedUri = uri;

  // 1. Ensure absolute scheme
  if (!normalizedUri.startsWith('file://') && !normalizedUri.startsWith('content://') && !normalizedUri.startsWith('http')) {
    normalizedUri = `file://${normalizedUri}`;
  }

  // 2. Space and special character encoding for file:// URIs
  // Note: content:// URIs should NOT be re-encoded aggressively as it can break Android's ContentResolver
  if (normalizedUri.startsWith('file://')) {
    // Only encode if it contains unencoded spaces
    if (normalizedUri.includes(' ') && !normalizedUri.includes('%20')) {
      // Encode everything after the scheme
      const pathPart = normalizedUri.replace('file://', '');
      normalizedUri = `file://${encodeURI(pathPart)}`;
    }
  }

  // 3. Android specific content:// resolution if needed in the future
  // (e.g., if we ever need to copy a locked content:// file to a temp file:// for processing)
  if (Platform.OS === 'android' && normalizedUri.startsWith('content://')) {
     // expo-file-system supports reading from content:// natively for now.
     // This acts as a hook point if OEMs (Samsung, Xiaomi) return malformed content URIs.
  }

  return normalizedUri;
}

/**
 * Gets the standard cache path for a song's artwork on disk.
 */
export function getArtworkCachePath(songId: string): string {
  // Use CacheDirectory - safer as the OS can clear it if storage is low.
  return `${Paths.cache.uri}artworks/${songId}.jpg`;
}

/**
 * Ensures the artwork cache directory exists.
 * Uses the new Expo 56+ Directory API instead of deprecated legacy methods.
 */
export async function ensureArtworkCacheDirectory(): Promise<void> {
  const dir = new Directory(Paths.cache, 'artworks');
  if (!dir.exists) {
    dir.create();
  }
}
