import { useState, useEffect, useMemo } from 'react';
import { useLibraryStore } from '../store/libraryStore';
import { Song } from '../types';
import { tokenize } from '../utils/searchNormalization';
import { rankSearchResults } from '../utils/searchRanking';

export function useSearch(query: string): Song[] {
  const searchIndex = useLibraryStore((s) => s.searchIndex);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 120);

    return () => clearTimeout(handler);
  }, [query]);

  // Execute search and ranking
  return useMemo(() => {
    if (!searchIndex) return [];
    if (!debouncedQuery || debouncedQuery.trim().length < 2) return [];

    const terms = tokenize(debouncedQuery);
    if (terms.length === 0) return [];

    // Set Intersection
    const [first, ...rest] = terms;
    let matchIds: Set<string> = new Set(searchIndex.tokens.get(first) ?? []);

    for (const term of rest) {
      if (matchIds.size === 0) break;
      const termIds = searchIndex.tokens.get(term) ?? new Set();
      matchIds = new Set([...matchIds].filter((id) => termIds.has(id)));
    }

    if (matchIds.size === 0) return [];

    // Map to songs
    const matchedSongs = [...matchIds]
      .map((id) => searchIndex.songById.get(id))
      .filter((song): song is Song => song !== undefined);

    // Rank and Cap
    const ranked = rankSearchResults(debouncedQuery, matchedSongs);
    return ranked.slice(0, 100);

  }, [debouncedQuery, searchIndex]);
}
