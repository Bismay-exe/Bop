import TrackPlayer, { 
  AppKilledPlaybackBehavior, 
  Capability, 
  RepeatMode, 
  Track,
  Event
} from 'react-native-track-player';
import { Song, PlaybackState as CustomPlaybackState } from '../types';
import { usePlayerStore } from '../store/playerStore';
import { prefetchLyricsForTrack } from './lyrics/lyricsPrefetch';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';

let isSetup = false;

const FULL_CAPABILITIES = [
  Capability.Play,
  Capability.Pause,
  Capability.SkipToNext,
  Capability.SkipToPrevious,
  Capability.SeekTo,
  Capability.Stop,
];

function buildOptions(showControls: boolean) {
  return {
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      alwaysPauseOnInterruption: true, // Crucial for Audio Focus (e.g. unplug headphones)
    },
    capabilities: showControls ? FULL_CAPABILITIES : [],
  };
}

export async function setupTrackPlayer(): Promise<void> {
  if (isSetup) return;

  try {
    await TrackPlayer.setupPlayer();

    const showControls = useSettingsStore.getState().showPlaybackControls;
    await TrackPlayer.updateOptions(buildOptions(showControls));

    isSetup = true;
    console.log('[TrackPlayerService] Successfully initialized');
  } catch (error) {
    console.error('[TrackPlayerService] Setup failed:', error);
  }
}

/**
 * Re-applies notification/lock-screen controls based on the user's setting.
 */
export async function applyNotificationControls(showControls: boolean): Promise<void> {
  if (!isSetup) return;
  try {
    await TrackPlayer.updateOptions(buildOptions(showControls));
  } catch (error) {
    console.error('[TrackPlayerService] applyNotificationControls failed:', error);
  }
}

/**
 * Sets playback speed (0.5x–2.0x). Persisted speed is re-applied after each load.
 */
export async function setPlaybackRate(rate: number): Promise<void> {
  if (!isSetup) return;
  try {
    await TrackPlayer.setRate(rate);
  } catch (error) {
    console.error('[TrackPlayerService] setPlaybackRate failed:', error);
  }
}

/**
 * Starts event listeners to sync RNTP state to Zustand.
 * Call this exactly ONCE in the root layout.
 */
export function startEventSync(): () => void {
  const sub1 = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    let state: CustomPlaybackState = 'stopped';
    if (event.state === 'playing') state = 'playing';
    else if (event.state === 'paused') state = 'paused';
    else if (event.state === 'loading' || event.state === 'buffering') state = 'loading';
    else if (event.state === 'error') state = 'error';
    
    usePlayerStore.getState().setPlaybackState(state);
  });

  const sub2 = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
    if (event.track) {
      // It's a minimal Track object; we can cast or fetch details.
      // We stored the full `Song` attributes when we added it via mapSongToTrack,
      // but to be safe we can extract what RNTP gives us.
      const track = event.track;
      const librarySong = useLibraryStore.getState().songs.find(s => s.id === track.id);
      
      const song: Song = librarySong ? librarySong : {
        id: track.id,
        uri: track.url || '',
        filename: 'unknown',
        modificationTime: 0,
        title: track.title || 'Unknown',
        artist: track.artist || 'Unknown',
        album: track.album || 'Unknown',
        artwork: track.artwork || undefined,
        duration: track.duration || 0,
        dateAdded: Date.now(),
      };
      usePlayerStore.getState().setCurrentTrack(song);
      
      // Add to recently played and increment play count
      useLibraryStore.getState().addRecentlyPlayed(song.id);
      useLibraryStore.getState().incrementPlayCount(song.id);

      // Aggressively prefetch lyrics in the background
      prefetchLyricsForTrack(song.artist, song.title, song.id);
    } else {
      usePlayerStore.getState().setCurrentTrack(null);
    }
    
    // Also sync queue index
    const index = await TrackPlayer.getActiveTrackIndex();
    usePlayerStore.getState().setQueueIndex(index || 0);
  });

  return () => {
    sub1.remove();
    sub2.remove();
  };
}

/**
 * Maps our custom Song type to RNTP's Track type
 */
function mapSongToTrack(song: Song): Track {
  return {
    id: song.id,
    url: song.uri,
    title: song.title,
    artist: song.artist,
    album: song.album,
    artwork: song.artwork || undefined,
    duration: song.duration,
  };
}

/**
 * Replaces the entire queue with a new list of songs and starts playing from the specified index.
 */
export async function replaceQueueAndPlay(songs: Song[], startIndex: number = 0): Promise<void> {
  if (!isSetup) return;
  
  try {
    await TrackPlayer.reset();
    const tracks = songs.map(mapSongToTrack);
    await TrackPlayer.add(tracks);
    usePlayerStore.getState().setQueue(songs); // Mirror to Zustand
    await TrackPlayer.skip(startIndex);
    await TrackPlayer.setVolume(1.0); // Ensure volume is fully restored
    await TrackPlayer.play();

    // Re-apply the user's chosen playback speed (resets to 1.0 on a fresh queue otherwise).
    const rate = useSettingsStore.getState().playbackSpeed;
    if (rate !== 1.0) {
      await TrackPlayer.setRate(rate);
    }
  } catch (error) {
    console.error('[TrackPlayerService] replaceQueueAndPlay failed:', error);
  }
}

/**
 * Toggles play/pause state
 */
export async function togglePlayback(): Promise<void> {
  if (!isSetup) return;
  
  try {
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === 'playing') {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  } catch (error) {
    console.error('[TrackPlayerService] togglePlayback failed:', error);
  }
}

/**
 * Basic Playback Controls
 */
export const PlaybackService = {
  play: async () => isSetup && TrackPlayer.play(),
  pause: async () => isSetup && TrackPlayer.pause(),
  next: async () => isSetup && TrackPlayer.skipToNext(),
  prev: async () => isSetup && TrackPlayer.skipToPrevious(),
  seekTo: async (position: number) => isSetup && TrackPlayer.seekTo(position),
  setRepeatMode: async (mode: RepeatMode) => isSetup && TrackPlayer.setRepeatMode(mode),
  skip: async (index: number) => isSetup && TrackPlayer.skip(index),
};
