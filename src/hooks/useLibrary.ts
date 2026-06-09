import { useMemo } from 'react';
import { useLibraryStore } from '../store/libraryStore';
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

export function useAlbums(): AlbumGroup[] {
  const songs = useLibraryStore((s) => s.songs);

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
  const songs = useLibraryStore((s) => s.songs);

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
  const songs = useLibraryStore((s) => s.songs);

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
  const songs = useLibraryStore((s) => s.songs);

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
  const songs = useLibraryStore((s) => s.songs);

  return useMemo(() => {
    const map = new Map<string, CategoryGroup>();
    for (const song of songs) {
      const key = song.folder || 'Unknown Folder';
      if (!map.has(key)) {
        map.set(key, { name: key, songs: [] });
      }
      map.get(key)!.songs.push(song);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);
}

export function useLanguages(): CategoryGroup[] {
  const songs = useLibraryStore((s) => s.songs);

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
  const songs = useLibraryStore((s) => s.songs);

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
  const songs = useLibraryStore((s) => s.songs);
  const recentlyPlayed = useLibraryStore((s) => s.recentlyPlayed);

  return useMemo(() => {
    const songMap = new Map(songs.map(s => [s.id, s]));
    // Return songs in the order they were recently played
    return recentlyPlayed.map(id => songMap.get(id)).filter((s): s is Song => !!s);
  }, [songs, recentlyPlayed]);
}

export function useFavorites(): Song[] {
  const songs = useLibraryStore((s) => s.songs);
  const favorites = useLibraryStore((s) => s.favorites);

  return useMemo(() => {
    return songs.filter(s => favorites.has(s.id));
  }, [songs, favorites]);
}

export function usePlaylists(): Playlist[] {
  // Direct selector since it's already an array in store, 
  // but we can sort them here if needed.
  return useLibraryStore((s) => s.playlists);
}

export function useOnRepeat(): Song[] {
  const songs = useLibraryStore((s) => s.songs);
  const playCounts = useLibraryStore((s) => s.playCounts);

  return useMemo(() => {
    // Only include songs that have been played at least once
    const repeated = songs.filter(s => (playCounts[s.id] || 0) > 0);
    // Sort by play count descending
    return repeated.sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0));
  }, [songs, playCounts]);
}
