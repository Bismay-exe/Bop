import { usePlayerStore } from '../store/playerStore';
import { PlaybackService, replaceQueueAndPlay, togglePlayback } from '../services/TrackPlayerService';
import { Song } from '../types';

/**
 * A unified hook for UI components to read playback state and trigger actions.
 * State is read from Zustand (which mirrors RNTP), and mutations are delegated to TrackPlayerService.
 * NOTE: Progress state is NOT here. Use `useProgress()` from `react-native-track-player` for that.
 */
export function usePlayer() {
  const { currentTrack, playbackState, queue, queueIndex } = usePlayerStore();

  const isPlaying = playbackState === 'playing';
  const isPaused = playbackState === 'paused';
  const isLoading = playbackState === 'loading';

  return {
    // State
    currentTrack,
    playbackState,
    queue,
    queueIndex,
    isPlaying,
    isPaused,
    isLoading,

    // Actions
    play: PlaybackService.play,
    pause: PlaybackService.pause,
    togglePlayback,
    next: PlaybackService.next,
    prev: PlaybackService.prev,
    seekTo: PlaybackService.seekTo,
    skip: PlaybackService.skip,
    
    // High-level Actions
    playSongFromLibrary: async (song: Song, allSongs: Song[]) => {
      const index = allSongs.findIndex(s => s.id === song.id);
      if (index === -1) return;
      await replaceQueueAndPlay(allSongs, index);
    },
  };
}
