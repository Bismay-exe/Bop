import { Song } from '../types';
import { normalizeText } from './searchNormalization';

export function rankSearchResults(query: string, songs: Song[]): Song[] {
  if (!query || query.trim() === '') return songs;

  const normalizedQuery = normalizeText(query);
  
  return songs.sort((a, b) => {
    const aTitle = normalizeText(a.title);
    const bTitle = normalizeText(b.title);
    const aArtist = normalizeText(a.artist);
    const bArtist = normalizeText(b.artist);
    const aAlbum = normalizeText(a.album);
    const bAlbum = normalizeText(b.album);

    // 1. Exact title match
    const aExactTitle = aTitle === normalizedQuery;
    const bExactTitle = bTitle === normalizedQuery;
    if (aExactTitle && !bExactTitle) return -1;
    if (!aExactTitle && bExactTitle) return 1;

    // 2. Title startsWith
    const aTitleStarts = aTitle.startsWith(normalizedQuery);
    const bTitleStarts = bTitle.startsWith(normalizedQuery);
    if (aTitleStarts && !bTitleStarts) return -1;
    if (!aTitleStarts && bTitleStarts) return 1;

    // 3. Exact artist match
    const aExactArtist = aArtist === normalizedQuery;
    const bExactArtist = bArtist === normalizedQuery;
    if (aExactArtist && !bExactArtist) return -1;
    if (!aExactArtist && bExactArtist) return 1;

    // 4. Partial title match
    const aTitleIncludes = aTitle.includes(normalizedQuery);
    const bTitleIncludes = bTitle.includes(normalizedQuery);
    if (aTitleIncludes && !bTitleIncludes) return -1;
    if (!aTitleIncludes && bTitleIncludes) return 1;

    // 5. Album matches (already includes via index, just sort them higher if album includes query)
    const aAlbumIncludes = aAlbum.includes(normalizedQuery);
    const bAlbumIncludes = bAlbum.includes(normalizedQuery);
    if (aAlbumIncludes && !bAlbumIncludes) return -1;
    if (!aAlbumIncludes && bAlbumIncludes) return 1;

    // Finally, sort alphabetically by title as fallback
    return a.title.localeCompare(b.title);
  });
}
