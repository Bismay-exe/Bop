/**
 * Cloud library store — liked songs, playlists, and history synced from the
 * backend when the user is signed in.
 *
 * Kept SEPARATE from the local `libraryStore` on purpose: that store reconciles
 * its favorites/playlists against scanned device files (finalizeScan), which
 * would wipe online videoIds. This store is the source of truth for ONLINE
 * library data. UI shows local or cloud depending on auth/section.
 *
 * Like toggles are OPTIMISTIC: the Set updates immediately, the network call
 * runs in the background, and we roll back on failure.
 */
import { create } from 'zustand';
import { Song } from '../types';
import {
  CloudPlaylist,
  cloudSongToSong,
  getLikedSongs,
  getPlaylists,
  likeSong,
  songToMeta,
  unlikeSong,
} from '../services/api/endpoints';
import { ApiRequestError } from '../services/api/client';

interface CloudLibraryState {
  likedIds: Set<string>; // videoIds
  likedSongs: Song[]; // full objects, newest first
  playlists: CloudPlaylist[];
  loading: boolean;
  loaded: boolean;

  isLiked: (videoId: string) => boolean;
  refresh: () => Promise<void>;
  toggleLike: (song: Song) => Promise<void>;
  refreshPlaylists: () => Promise<void>;
  clear: () => void;
}

export const useCloudLibraryStore = create<CloudLibraryState>((set, get) => ({
  likedIds: new Set(),
  likedSongs: [],
  playlists: [],
  loading: false,
  loaded: false,

  isLiked: (videoId) => get().likedIds.has(videoId),

  refresh: async () => {
    set({ loading: true });
    try {
      const [liked, playlists] = await Promise.all([getLikedSongs(200, 0), getPlaylists()]);
      const songs = liked.map(cloudSongToSong);
      set({
        likedSongs: songs,
        likedIds: new Set(songs.map((s) => s.videoId!).filter(Boolean)),
        playlists,
        loaded: true,
        loading: false,
      });
    } catch (e) {
      // 401 just means not signed in — clear silently.
      if (e instanceof ApiRequestError && e.status === 401) {
        get().clear();
      }
      set({ loading: false });
    }
  },

  toggleLike: async (song) => {
    const videoId = song.videoId;
    if (!videoId) return;

    const currentlyLiked = get().likedIds.has(videoId);
    // Optimistic update.
    set((state) => {
      const ids = new Set(state.likedIds);
      let songs = state.likedSongs;
      if (currentlyLiked) {
        ids.delete(videoId);
        songs = songs.filter((s) => s.videoId !== videoId);
      } else {
        ids.add(videoId);
        songs = [song, ...songs];
      }
      return { likedIds: ids, likedSongs: songs };
    });

    try {
      if (currentlyLiked) {
        await unlikeSong(videoId);
      } else {
        await likeSong(videoId, songToMeta(song));
      }
    } catch (e) {
      // Roll back on failure.
      set((state) => {
        const ids = new Set(state.likedIds);
        let songs = state.likedSongs;
        if (currentlyLiked) {
          ids.add(videoId);
          songs = [song, ...songs.filter((s) => s.videoId !== videoId)];
        } else {
          ids.delete(videoId);
          songs = songs.filter((s) => s.videoId !== videoId);
        }
        return { likedIds: ids, likedSongs: songs };
      });
      console.warn('[cloudLibrary] like toggle failed, rolled back', e);
    }
  },

  refreshPlaylists: async () => {
    try {
      const playlists = await getPlaylists();
      set({ playlists });
    } catch (e) {
      console.warn('[cloudLibrary] playlist refresh failed', e);
    }
  },

  clear: () => set({ likedIds: new Set(), likedSongs: [], playlists: [], loaded: false }),
}));
