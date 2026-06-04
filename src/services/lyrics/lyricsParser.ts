import { LyricsLine } from '../../types/media';

interface RawLyricItem {
  text?: string;
  timestamp?: number;
}

/**
 * Parses raw embedded lyrics strings or objects into a structured format.
 */
export function parseEmbeddedLyrics(rawLyrics: any): LyricsLine[] | undefined {
  if (!rawLyrics || (Array.isArray(rawLyrics) && rawLyrics.length === 0)) {
    return undefined;
  }

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
    
    return parsePlainLyrics(fullText);
  }

  return parsed.length > 0 ? parsed : undefined;
}

/**
 * Parses a plain text lyrics string.
 */
export function parsePlainLyrics(fullText: string): LyricsLine[] | undefined {
  if (!fullText || !fullText.trim()) return undefined;

  const parsed: LyricsLine[] = [];
  const lines = fullText.split(/\r?\n/);
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    parsed.push({
      text: line,
      isSectionHeader: /^\[.*\]$/.test(line),
    });
  }

  return parsed.length > 0 ? parsed : undefined;
}

/**
 * Parses LRC formatted synced lyrics string into structured format.
 * Example LRC line: [00:10.50] Hello world
 */
export function parseSyncedLyrics(lrcText: string): LyricsLine[] | undefined {
  if (!lrcText || !lrcText.trim()) return undefined;

  const parsed: LyricsLine[] = [];
  const lines = lrcText.split(/\r?\n/);

  // Regex to match [mm:ss.xx] or [mm:ss.xxx]
  const timeRegex = /^\[(\d{2}):(\d{2}\.\d{2,3})\](.*)/;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      
      const timestampMs = Math.floor((minutes * 60 + seconds) * 1000);
      
      // Even if text is empty, keeping the timestamp might be useful for instrumental gaps
      if (text) {
        parsed.push({
          text,
          timestamp: timestampMs,
          isSectionHeader: /^\[.*\]$/.test(text), // unlikely in pure LRC, but just in case
        });
      }
    } else {
      // Line without timestamp, treat as plain text
      parsed.push({
        text: line,
        isSectionHeader: /^\[.*\]$/.test(line),
      });
    }
  }

  return parsed.length > 0 ? parsed : undefined;
}
