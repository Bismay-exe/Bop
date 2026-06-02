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

export function useAlbums(): AlbumGroup[] {
  const songs = useLibraryStore((s) => s.songs);

  return useMemo(() => {
    const map = new Map<string, AlbumGroup>();
    for (const song of songs) {
      const key = song.album.trim() || 'Unknown Album';
      if (!map.has(key)) {
        map.set(key, { name: key, artist: song.artist, songs: [], artwork: song.artwork });
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
      const key = song.artist.trim() || 'Unknown Artist';
      if (!map.has(key)) {
        map.set(key, { name: key, songs: [] });
      }
      map.get(key)!.songs.push(song);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);
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
