import { Directory, File, Paths } from 'expo-file-system';
import { lyricsStorage } from './lyrics/lyricsCache';

/**
 * Computes the on-disk size (bytes) of caches the user can safely clear:
 * extracted artwork images. Best-effort; returns 0 on failure.
 */
export function getCacheSizeBytes(): number {
  let total = 0;
  try {
    const dir = new Directory(Paths.cache, 'artworks');
    if (!dir.exists) return 0;
    for (const entry of dir.list()) {
      if (entry instanceof File) {
        total += entry.size ?? 0;
      }
    }
  } catch (error) {
    console.log('[storageMaintenance] size calc failed (non-fatal)', error);
  }
  return total;
}

/**
 * Deletes temporary caches (artwork on disk + cached lyrics).
 * Does NOT touch the song database, playlists, favorites or settings.
 */
export function clearMediaCaches(): void {
  try {
    const dir = new Directory(Paths.cache, 'artworks');
    if (dir.exists) {
      for (const entry of dir.list()) {
        if (entry instanceof File) {
          try {
            entry.delete();
          } catch {
            // ignore individual file failures
          }
        }
      }
    }
  } catch (error) {
    console.log('[storageMaintenance] artwork clear failed (non-fatal)', error);
  }

  try {
    lyricsStorage.clearAll();
  } catch (error) {
    console.log('[storageMaintenance] lyrics cache clear failed (non-fatal)', error);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    const kb = bytes / 1024;
    return `${Math.max(1, Math.round(kb))} KB`;
  }
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
