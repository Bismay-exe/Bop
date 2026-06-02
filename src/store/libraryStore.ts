import { create } from 'zustand';
import { Song, Playlist } from '../types';
import { SearchIndex, buildSearchIndex } from '../utils/buildSearchIndex';

interface LibraryStore {
  songs: Song[];
  playlists: Playlist[];
  favorites: Set<string>;
  recentlyPlayed: string[]; // Song IDs, max 50
  isScanning: boolean;
  isRefreshing: boolean;
  scanProgress: number; // 0-1
  lastScanned: number | null;
  searchIndex: SearchIndex | null; // Derived state, never persisted

  setSongs: (songs: Song[]) => void;
  updateSongInPlace: (id: string, updates: Partial<Song>) => void;
  setScanning: (value: boolean) => void;
  setRefreshing: (value: boolean) => void;
  setScanProgress: (value: number) => void;
  finalizeScan: () => void; // Builds index, reconciles, persists
  
  addPlaylist: (playlist: Playlist) => void;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;
  
  toggleFavorite: (songId: string) => void;
  addRecentlyPlayed: (songId: string) => void;
  
  reconcileLibrary: () => void; // Removes orphaned IDs

  hydrate: () => Promise<void>; // Implemented via StorageService
  persist: () => Promise<void>; // Implemented via StorageService
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  songs: [],
  playlists: [],
  favorites: new Set(),
  recentlyPlayed: [],
  isScanning: false,
  isRefreshing: false,
  scanProgress: 0,
  lastScanned: null,
  searchIndex: null,

  setSongs: (songs) => set({ songs, lastScanned: Date.now() }),
  updateSongInPlace: (id, updates) => set((state) => ({
    songs: state.songs.map(s => s.id === id ? { ...s, ...updates } : s),
  })),
  setScanning: (isScanning) => set({ isScanning }),
  setRefreshing: (isRefreshing) => set({ isRefreshing }),
  setScanProgress: (scanProgress) => set({ scanProgress }),
  
  finalizeScan: () => {
    // Batched update to prevent multiple renders
    set((state) => {
      // 1. Rebuild search index
      const searchIndex = buildSearchIndex(state.songs);
      
      // 2. Reconcile (remove orphaned IDs)
      const validSongIds = new Set(state.songs.map(s => s.id));
      
      const newFavorites = new Set([...state.favorites].filter(id => validSongIds.has(id)));
      const newRecentlyPlayed = state.recentlyPlayed.filter(id => validSongIds.has(id));
      const newPlaylists = state.playlists.map(p => ({
        ...p,
        songIds: p.songIds.filter(id => validSongIds.has(id))
      }));

      return {
        searchIndex,
        favorites: newFavorites,
        recentlyPlayed: newRecentlyPlayed,
        playlists: newPlaylists,
        isScanning: false,
        isRefreshing: false,
      };
    });
    
    // Fire persist outside of state setter
    get().persist();
  },
  
  addPlaylist: (playlist) => set((state) => ({ playlists: [...state.playlists, playlist] })),
  updatePlaylist: (id, updates) => set((state) => ({
    playlists: state.playlists.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)
  })),
  deletePlaylist: (id) => set((state) => ({ playlists: state.playlists.filter(p => p.id !== id) })),
  
  toggleFavorite: (songId) => set((state) => {
    const newFavorites = new Set(state.favorites);
    if (newFavorites.has(songId)) {
      newFavorites.delete(songId);
    } else {
      newFavorites.add(songId);
    }
    return { favorites: newFavorites };
  }),
  
  addRecentlyPlayed: (songId) => set((state) => {
    // Deduplicate and move existing item to the front, capping at 50
    const filtered = state.recentlyPlayed.filter(id => id !== songId);
    return { recentlyPlayed: [songId, ...filtered].slice(0, 50) };
  }),

  reconcileLibrary: () => set((state) => {
    const validSongIds = new Set(state.songs.map(s => s.id));
    
    const newFavorites = new Set([...state.favorites].filter(id => validSongIds.has(id)));
    const newRecentlyPlayed = state.recentlyPlayed.filter(id => validSongIds.has(id));
    const newPlaylists = state.playlists.map(p => ({
      ...p,
      songIds: p.songIds.filter(id => validSongIds.has(id))
    }));

    return {
      favorites: newFavorites,
      recentlyPlayed: newRecentlyPlayed,
      playlists: newPlaylists,
    };
  }),

  hydrate: async () => {}, // Injected by StorageService
  persist: async () => {}, // Injected by StorageService
}));
