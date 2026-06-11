import { Song } from '../types';
import { tokenize } from './searchNormalization';

export interface SearchIndex {
  tokens: Map<string, Set<string>>;
  songById: Map<string, Song>;
}

// Defensive limit to prevent memory blowups from corrupted metadata
const MAX_TOKEN_LENGTH = 30; 

export function buildSearchIndex(songs: Song[]): SearchIndex {
  const tokens = new Map<string, Set<string>>();
  const songById = new Map<string, Song>();

  for (const song of songs) {
    songById.set(song.id, song);
    
    // Tokenize combined metadata
    const terms = tokenize(`${song.title} ${song.artist} ${song.album}`);
    
    for (const term of terms) {
      // Ignore excessively long tokens and empty tokens
      if (term.length > MAX_TOKEN_LENGTH || term.length === 0) {
        continue;
      }
      
      if (!tokens.has(term)) {
        tokens.set(term, new Set());
      }
      tokens.get(term)!.add(song.id);
    }
  }

  return { tokens, songById };
}
