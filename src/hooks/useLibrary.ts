import { useMemo } from 'react';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore, SortOrder } from '../store/settingsStore';
import { Song, Playlist } from '../types';

export interface AlbumGroup {
  name: string;
  artist: string;
  songs: Song[];
  artwork?: string;
}

export interface ArtistGroup {
  name: string;
  songs: Song[];
}

export interface CategoryGroup {
  name: string;
  songs: Song[];
}

function folderKey(song: Song): string {
  return song.folder || 'Unknown Folder';
}

function sortSongs(songs: Song[], order: SortOrder): Song[] {
  const copy = [...songs];
  switch (order) {
    case 'title':
      copy.sort((a, b) => (a.title || a.filename).localeCompare(b.title || b.filename));
      break;
    case 'album':
      copy.sort((a, b) => (a.album || '').localeCompare(b.album || ''));
      break;
    case 'dateAdded':
      copy.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
      break;
    case 'artist':
    default:
      copy.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      break;
  }
  return copy;
}

/**
 * The canonical, user-facing song list: hides songs in ignored folders and
 * applies the user's default sort order. All browse surfaces build on this.
 */
export function useVisibleSongs(): Song[] {
  const songs = useLibraryStore((s) => s.songs);
  const ignoredFolders = useSettingsStore((s) => s.ignoredFolders);
  const sortOrder = useSettingsStore((s) => s.sortOrder);

  return useMemo(() => {
    const ignored = new Set(ignoredFolders);
    const filtered = ignored.size > 0 ? songs.filter((s) => !ignored.has(folderKey(s))) : songs;
    return sortSongs(filtered, sortOrder);
  }, [songs, ignoredFolders, sortOrder]);
}

// Alias for readability at call sites that just want the song list.
export const useSongs = useVisibleSongs;

export function useAlbums(): AlbumGroup[] {
  const songs = useVisibleSongs();

  return useMemo(() => {
    const map = new Map<string, AlbumGroup>();
    for (const song of songs) {
      const key = (song.album || 'Unknown Album').trim();
      if (!map.has(key)) {
        map.set(key, { name: key, artist: song.artist || 'Unknown Artist', songs: [], artwork: song.artwork });
      }
      map.get(key)!.songs.push(song);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);
}

export function useArtists(): ArtistGroup[] {
  const songs = useVisibleSongs();

  return useMemo(() => {
    const map = new Map<string, ArtistGroup>();
    for (const song of songs) {
      const key = (song.artist || 'Unknown Artist').trim();
      if (!map.has(key)) {
        map.set(key, { name: key, songs: [] });
      }
      map.get(key)!.songs.push(song);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);
}

export function useGenres(): CategoryGroup[] {
  const songs = useVisibleSongs();

  return useMemo(() => {
    const map = new Map<string, CategoryGroup>();
    for (const song of songs) {
      const key = (song.genre || 'Unknown Genre').trim();
      if (!map.has(key)) {
        map.set(key, { name: key, songs: [] });
      }
      map.get(key)!.songs.push(song);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);
}

export function useYears(): CategoryGroup[] {
  const songs = useVisibleSongs();

  return useMemo(() => {
    const map = new Map<string, CategoryGroup>();
    for (const song of songs) {
      const key = song.year ? song.year.toString() : 'Unknown Year';
      if (!map.has(key)) {
        map.set(key, { name: key, songs: [] });
      }
      map.get(key)!.songs.push(song);
    }
    return Array.from(map.values()).sort((a, b) => b.name.localeCompare(a.name)); // Descending year
  }, [songs]);
}

export function useFolders(): CategoryGroup[] {
  const songs = useVisibleSongs();

  return useMemo(() => {
    const map = new Map<string, CategoryGroup>();
    for (const song of songs) {
      const key = folderKey(song);
      if (!map.has(key)) {
        map.set(key, { name: key, songs: [] });
      }
      map.get(key)!.songs.push(song);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);
}

export function useLanguages(): CategoryGroup[] {
  const songs = useVisibleSongs();

  return useMemo(() => {
    const map = new Map<string, CategoryGroup>();
    for (const song of songs) {
      const key = (song.language || 'Unknown Language').trim();
      if (!map.has(key)) {
        map.set(key, { name: key, songs: [] });
      }
      map.get(key)!.songs.push(song);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);
}

export function useMoods(): CategoryGroup[] {
  const songs = useVisibleSongs();

  return useMemo(() => {
    const map = new Map<string, CategoryGroup>();
    for (const song of songs) {
      const key = (song.mood || 'Unknown Mood').trim();
      if (!map.has(key)) {
        map.set(key, { name: key, songs: [] });
      }
      map.get(key)!.songs.push(song);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);
}

export function useRecentlyPlayed(): Song[] {
  const songs = useVisibleSongs();
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);

  return useMemo(() => {
    const songMap = new Map(songs.map((s) => [s.id, s]));
    // Return songs in the order they were recently played
    return recentlyPlayed.map((id) => songMap.get(id)).filter((s): s is Song => !!s);
  }, [songs, recentlyPlayed]);
}

export function useFavorites(): Song[] {
  const songs = useVisibleSongs();
  const favorites = useLibraryStore((s) => s.favorites);

  return useMemo(() => {
    return songs.filter((s) => favorites.has(s.id));
  }, [songs, favorites]);
}

export function usePlaylists(): Playlist[] {
  // Direct selector since it's already an array in store,
  // but we can sort them here if needed.
  return useLibraryStore((s) => s.playlists);
}

export function useOnRepeat(): Song[] {
  const songs = useVisibleSongs();
  const playCounts = useLibraryStore((s) => s.playCounts);

  return useMemo(() => {
    // Only include songs that have been played at least once
    const repeated = songs.filter((s) => (playCounts[s.id] || 0) > 0);
    // Sort by play count descending
    return repeated.sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0));
  }, [songs, playCounts]);
}
