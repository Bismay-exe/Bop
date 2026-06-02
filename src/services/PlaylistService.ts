import { Playlist } from '../types';
import { useLibraryStore } from '../store/libraryStore';
import { v4 as uuidv4 } from 'uuid';

export const PlaylistService = {
  createPlaylist: async (name: string): Promise<Playlist> => {
    const newPlaylist: Playlist = {
      id: uuidv4(),
      name: name.trim(),
      songIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    useLibraryStore.getState().addPlaylist(newPlaylist);
    await useLibraryStore.getState().persist();
    return newPlaylist;
  },

  renamePlaylist: async (id: string, name: string): Promise<void> => {
    useLibraryStore.getState().updatePlaylist(id, { name: name.trim() });
    await useLibraryStore.getState().persist();
  },

  deletePlaylist: async (id: string): Promise<void> => {
    useLibraryStore.getState().deletePlaylist(id);
    await useLibraryStore.getState().persist();
  },

  addSongsToPlaylist: async (playlistId: string, songIds: string[]): Promise<void> => {
    const store = useLibraryStore.getState();
    const playlist = store.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    // Prevent duplicate song IDs explicitly as per PRD constraints
    const existingIds = new Set(playlist.songIds);
    const newIds = songIds.filter(id => !existingIds.has(id));

    if (newIds.length > 0) {
      store.updatePlaylist(playlistId, { songIds: [...playlist.songIds, ...newIds] });
      await store.persist();
    }
  },

  removeSongFromPlaylist: async (playlistId: string, songId: string): Promise<void> => {
    const store = useLibraryStore.getState();
    const playlist = store.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    store.updatePlaylist(playlistId, {
      songIds: playlist.songIds.filter(id => id !== songId)
    });
    await store.persist();
  },

  reorderSongsInPlaylist: async (playlistId: string, from: number, to: number): Promise<void> => {
    const store = useLibraryStore.getState();
    const playlist = store.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const newSongIds = [...playlist.songIds];
    const [movedId] = newSongIds.splice(from, 1);
    newSongIds.splice(to, 0, movedId);

    store.updatePlaylist(playlistId, { songIds: newSongIds });
    await store.persist();
  }
};
