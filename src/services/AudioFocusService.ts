import TrackPlayer, { Event } from 'react-native-track-player';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { writePlaybackSnapshot } from './StorageService';

/**
 * Registers Audio Focus handlers for interruptions (calls, headphones unplugged, etc)
 * Call this exactly ONCE in the root layout after TrackPlayer is set up.
 */
export function registerAudioFocusHandlers(): () => void {
  // 1. Interruptions (another app requests audio, e.g. maps, notifications)
  const sub1 = TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.permanent) {
      // Focus lost permanently (e.g. another music player started)
      await TrackPlayer.pause();
    } else if (event.paused) {
      // Transient focus loss where system wants us to pause
      await TrackPlayer.pause();
    } else {
      // Focus restored
      await TrackPlayer.setVolume(1.0);
      // Auto-resume on device reconnect when the user opted in.
      const settings = useSettingsStore.getState();
      if (settings.resumeOnHeadphones || settings.autoplayBluetooth) {
        await TrackPlayer.play();
      }
    }
  });

  // 2. Headphone unplug is handled by `alwaysPauseOnInterruption: true` in TrackPlayerService
  // but we also want to catch general pauses (like phone calls) to write a snapshot.
  const sub2 = TrackPlayer.addEventListener(Event.RemotePause, async () => {
    await TrackPlayer.pause();
    await writePlaybackSnapshot();
  });

  const sub3 = TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    await TrackPlayer.play();
  });

  return () => {
    sub1.remove();
    sub2.remove();
    sub3.remove();
  };
}
