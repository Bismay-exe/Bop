import { create } from 'zustand';
import { Song, QueueItem, PlaybackState, RepeatMode } from '../types';
import { LyricsPayload } from '../services/lyrics/lyricsCache';

interface PlayerStore {
  currentTrack: Song | null;
  playbackState: PlaybackState;
  queue: QueueItem[];
  queueIndex: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  onlineLyrics: LyricsPayload | null;
  isFetchingLyrics: boolean;

  setCurrentTrack: (song: Song | null) => void;
  setOnlineLyrics: (payload: LyricsPayload | null) => void;
  setIsFetchingLyrics: (isFetching: boolean) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setQueue: (songs: Song[]) => void;
  clearQueue: () => void;
  setQueueIndex: (index: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  currentTrack: null,
  playbackState: 'stopped',
  queue: [],
  queueIndex: 0,
  repeatMode: 'off',
  shuffleEnabled: false,
  onlineLyrics: null,
  isFetchingLyrics: false,

  setCurrentTrack: (song) => set({ currentTrack: song, onlineLyrics: null, isFetchingLyrics: false }), // Clear lyrics when track changes
  setOnlineLyrics: (payload) => set({ onlineLyrics: payload, isFetchingLyrics: false }),
  setIsFetchingLyrics: (isFetching) => set({ isFetchingLyrics: isFetching }),
  setPlaybackState: (state) => set({ playbackState: state }),
  
  // These setters just MIRROR the RNTP state. 
  // No UI component should call these directly to mutate audio state.
  setQueue: (songs) => set({ queue: songs.map(s => ({ ...s, queueId: Math.random().toString() })) }),
  clearQueue: () => set({ queue: [], queueIndex: 0, currentTrack: null }),
  setQueueIndex: (index) => set({ queueIndex: index }),
  
  // UI toggles
  toggleRepeat: () => set((state) => {
    const nextMode: Record<RepeatMode, RepeatMode> = { off: 'queue', queue: 'track', track: 'off' };
    return { repeatMode: nextMode[state.repeatMode] };
  }),
  toggleShuffle: () => set((state) => ({ shuffleEnabled: !state.shuffleEnabled })),
}));
