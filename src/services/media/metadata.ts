import * as mm from 'music-metadata';
import { File } from 'expo-file-system';
import { RawAsset, ParsedMetadata, QueueTask } from '../../types/media';
import { normalizeAudioUri } from './uri';
import { cacheArtworkToDisk } from './artwork';
import { MediaConcurrency } from './concurrency';
import { parseLyrics } from './lyricsParser';

/**
 * Encapsulated parsing layer.
 * This abstracts away `music-metadata-browser` so that in the future,
 * if we transition to a high-performance native parser (e.g. for FLACs),
 * we only have to change this one function.
 */
async function extractMetadataNativeOrJS(uri: string): Promise<mm.IAudioMetadata | null> {
  try {
    const normalized = await normalizeAudioUri(uri);
    
    // Instead, we use the new File object which natively implements Blob,
    // read it to an ArrayBuffer (fast C++ binding), and parse the buffer.
    const file = new File(normalized);
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    return await mm.parseBuffer(uint8Array, 'audio/mpeg');
  } catch (error) {
    console.error(`[Metadata] Failed to parse: ${uri}`, error);
    return null;
  }
}

/**
 * Enqueues a Just-In-Time metadata extraction task.
 * Returns a cancel function that the UI can call if the song scrolls off-screen.
 */
export function queueMetadataExtraction(
  asset: RawAsset,
  priority: number,
  onComplete: (metadata: ParsedMetadata) => void
): () => void {
  let isCancelled = false;
  
  const task: QueueTask = {
    id: `meta_${asset.id}`,
    type: 'METADATA',
    priority,
    cancel: () => {
      isCancelled = true;
    },
    execute: async () => {
      if (isCancelled) return;
      
      // 1. Heavy File Read & Parsing
      const rawMeta = await extractMetadataNativeOrJS(asset.uri);
      
      // Bail if user scrolled away during the fetch/parse
      if (isCancelled || !rawMeta) return;

      const title = rawMeta.common.title || asset.filename.replace(/\.[^/.]+$/, '');
      const artist = rawMeta.common.artist || 'Unknown Artist';
      const album = rawMeta.common.album || (asset.albumId ? `Album ${asset.albumId}` : 'Unknown Album');
      const lyrics = parseLyrics(rawMeta.common.lyrics as any);
      
      let hasArtwork = false;
      let artworkHash = undefined;

      if (rawMeta.common.picture && rawMeta.common.picture.length > 0) {
        hasArtwork = true;
        // The hash prevents stale artwork cache across library rescans/modifications
        artworkHash = `${asset.id}_${asset.modificationTime}`;
        
        // 2. Heavy Disk Write
        // We queue artwork extraction separately into the lower-concurrency Artwork queue.
        // This ensures the main Metadata queue isn't blocked by slow filesystem writes.
        MediaConcurrency.artwork.enqueue({
          id: `art_${asset.id}`,
          type: 'ARTWORK',
          priority: priority, 
          cancel: () => {}, // We don't typically cancel disk writes once triggered, to ensure consistency
          execute: async () => {
            await cacheArtworkToDisk(asset.id, asset.modificationTime, rawMeta.common.picture![0].data);
          }
        });
      }

      // 3. Return results back to the Cache/UI layer
      onComplete({
        title,
        artist,
        album,
        hasArtwork,
        artworkHash,
        lyrics
      });
    }
  };

  MediaConcurrency.metadata.enqueue(task);
  
  return () => {
    task.cancel();
    MediaConcurrency.metadata.cancel(task.id);
  };
}
