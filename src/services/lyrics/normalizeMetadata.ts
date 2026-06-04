/**
 * Normalizes track titles and artist names to improve match rates with lyrics APIs like LRCLIB.
 * Removes noisy tags like (Remastered), [Official Audio], and featured artists.
 */

export function normalizeTitle(title: string): string {
  if (!title) return '';

  return title
    // Remove (feat. ...) or (ft. ...)
    .replace(/\(f(?:ea)?t\..*?\)/gi, '')
    // Remove [feat. ...] or [ft. ...]
    .replace(/\[f(?:ea)?t\..*?\]/gi, '')
    // Remove "feat. ..." at the end of string
    .replace(/f(?:ea)?t\..*$/gi, '')
    // Remove remaster/version tags in parentheses: (Remastered 2016), (Radio Edit)
    .replace(/\(.*?remaster.*?\)/gi, '')
    .replace(/\(.*?version.*?\)/gi, '')
    .replace(/\(.*?edit.*?\)/gi, '')
    // Remove tags in brackets: [Official Audio], [Remix]
    .replace(/\[.*?\]/g, '')
    // Remove everything after a dash if it implies a remaster/version (e.g. - Remastered)
    .replace(/-.*?remaster.*/gi, '')
    // Trim extra spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeArtist(artist: string): string {
  if (!artist) return '';

  return artist
    // Sometimes artist names have multiple artists separated by commas or ampersands.
    // LRCLIB usually matches better with just the primary artist.
    .split(',')[0]
    .split('&')[0]
    .split(' feat.')[0]
    .split(' ft.')[0]
    .trim();
}
