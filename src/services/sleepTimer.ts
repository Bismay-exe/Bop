import { create } from 'zustand';
import TrackPlayer from 'react-native-track-player';
import { useSettingsStore } from '../store/settingsStore';

const FADE_WINDOW_MS = 8000; // Start fading volume over the final 8 seconds.

let intervalId: ReturnType<typeof setInterval> | null = null;

interface SleepTimerStore {
  active: boolean;
  endsAt: number | null;
  remainingMs: number;
  start: (minutes: number) => void;
  cancel: () => void;
}

function clearTick() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

async function fireStop() {
  try {
    await TrackPlayer.pause();
  } catch {
    // ignore
  } finally {
    // Restore volume for the next playback session.
    try {
      await TrackPlayer.setVolume(1.0);
    } catch {
      // ignore
    }
  }
}

export const useSleepTimer = create<SleepTimerStore>((set, get) => ({
  active: false,
  endsAt: null,
  remainingMs: 0,

  start: (minutes) => {
    clearTick();
    const durationMs = Math.max(1, minutes) * 60 * 1000;
    const endsAt = Date.now() + durationMs;
    set({ active: true, endsAt, remainingMs: durationMs });

    intervalId = setInterval(() => {
      const state = get();
      if (!state.active || state.endsAt == null) {
        clearTick();
        return;
      }

      const remaining = state.endsAt - Date.now();

      if (remaining <= 0) {
        clearTick();
        set({ active: false, endsAt: null, remainingMs: 0 });
        fireStop();
        return;
      }

      // Fade out over the final window if enabled.
      if (useSettingsStore.getState().sleepFadeOut && remaining <= FADE_WINDOW_MS) {
        const volume = Math.max(0, remaining / FADE_WINDOW_MS);
        TrackPlayer.setVolume(volume).catch(() => {});
      }

      set({ remainingMs: remaining });
    }, 1000);
  },

  cancel: () => {
    clearTick();
    set({ active: false, endsAt: null, remainingMs: 0 });
    // Make sure volume is back to normal if we cancelled mid-fade.
    TrackPlayer.setVolume(1.0).catch(() => {});
  },
}));
