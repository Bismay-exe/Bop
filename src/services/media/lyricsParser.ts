import { LyricsLine } from '../../types/media';

interface RawLyricItem {
  text?: string;
  timestamp?: number;
}

/**
 * Parses raw lyrics strings into a structured format.
 * This separates text processing from metadata extraction,
 * preparing us for future .lrc synced lyrics support.
 */
export function parseLyrics(rawLyrics: any): LyricsLine[] | undefined {
  if (!rawLyrics || (Array.isArray(rawLyrics) && rawLyrics.length === 0)) {
    return undefined;
  }

  // music-metadata might return an array of strings, or an array of ILyricsTag objects
  // If we have an array of syncText objects, let's use them directly!
  let parsed: LyricsLine[] = [];

  if (Array.isArray(rawLyrics) && rawLyrics.length > 0 && typeof rawLyrics[0] === 'object' && 'syncText' in rawLyrics[0]) {
    // Handling SYLT (Synced Lyrics)
    const syncText = rawLyrics[0].syncText as RawLyricItem[];
    for (let item of syncText) {
      if (!item.text) continue;
      parsed.push({
        text: item.text.trim(),
        isSectionHeader: /^\[.*\]$/.test(item.text.trim()),
        timestamp: item.timestamp
      });
    }
  } else {
    // Unsynced or flat strings
    const fullText = Array.isArray(rawLyrics) 
      ? rawLyrics.map(l => typeof l === 'string' ? l : (l?.text || '')).join('\n') 
      : (typeof rawLyrics === 'string' ? rawLyrics : (rawLyrics as any)?.text || '');
    
    if (!fullText.trim()) return undefined;

    const lines = fullText.split(/\r?\n/);
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      parsed.push({
        text: line,
        isSectionHeader: /^\[.*\]$/.test(line),
      });
    }
  }

  return parsed.length > 0 ? parsed : undefined;
}
