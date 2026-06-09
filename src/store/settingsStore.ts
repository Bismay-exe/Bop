import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'settings-storage' });
const SETTINGS_KEY = 'app:settings';

export type SortOrder = 'artist' | 'title' | 'album' | 'dateAdded';
export type LyricsFontSize = 'small' | 'medium' | 'large';
export type BlurIntensity = 'low' | 'medium' | 'high';
export type LyricsBackground = 'gradient' | 'solid' | 'artwork';
export type GestureSensitivity = 'low' | 'medium' | 'high';
export type MiniPlayerStyle = 'floating' | 'docked';
export type SwipeBehavior = 'collapse' | 'dismiss';
export type RescanFrequency = 'startup' | 'manual' | 'daily';
export type LibraryViewMode = 'grid' | 'list';

export interface SettingsData {
  // Motion & Gestures
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  gestureSensitivity: GestureSensitivity;
  miniPlayerStyle: MiniPlayerStyle;
  swipeBehavior: SwipeBehavior;

  // Lyrics
  syncedLyrics: boolean;
  autoScrollLyrics: boolean;
  lyricsFontSize: LyricsFontSize;
  lyricsBlurIntensity: BlurIntensity;
  lyricsBackground: LyricsBackground;

  // Playback
  gaplessPlayback: boolean;
  playbackSpeed: number;
  resumeOnHeadphones: boolean;
  autoplayBluetooth: boolean;
  rememberQueue: boolean;
  resumeLastSession: boolean;

  // Sleep timer
  sleepDefaultMinutes: number;
  sleepFadeOut: boolean;

  // Library
  sortOrder: SortOrder;
  ignoredFolders: string[];
  albumsViewMode: LibraryViewMode;
  artistsViewMode: LibraryViewMode;

  // Notifications
  showPlaybackControls: boolean;

  // Advanced
  rescanFrequency: RescanFrequency;
}

export const DEFAULT_SETTINGS: SettingsData = {
  hapticsEnabled: true,
  reduceMotion: false,
  gestureSensitivity: 'medium',
  miniPlayerStyle: 'floating',
  swipeBehavior: 'collapse',

  syncedLyrics: true,
  autoScrollLyrics: true,
  lyricsFontSize: 'large',
  lyricsBlurIntensity: 'medium',
  lyricsBackground: 'gradient',

  gaplessPlayback: true,
  playbackSpeed: 1.0,
  resumeOnHeadphones: true,
  autoplayBluetooth: false,
  rememberQueue: true,
  resumeLastSession: true,

  sleepDefaultMinutes: 30,
  sleepFadeOut: true,

  sortOrder: 'artist',
  ignoredFolders: [],
  albumsViewMode: 'grid',
  artistsViewMode: 'grid',

  showPlaybackControls: true,

  rescanFrequency: 'startup',
};

interface SettingsStore extends SettingsData {
  hydrated: boolean;
  set: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => void;
  reset: () => void;
  hydrate: () => void;
}

function persist(data: SettingsData): void {
  try {
    storage.set(SETTINGS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[settingsStore] Failed to persist settings', error);
  }
}

function pickData(state: SettingsData): SettingsData {
  // Strip non-data fields (functions / hydrated flag) before persisting.
  const {
    hapticsEnabled, reduceMotion, gestureSensitivity, miniPlayerStyle, swipeBehavior,
    syncedLyrics, autoScrollLyrics, lyricsFontSize, lyricsBlurIntensity, lyricsBackground,
    gaplessPlayback, playbackSpeed, resumeOnHeadphones, autoplayBluetooth, rememberQueue, resumeLastSession,
    sleepDefaultMinutes, sleepFadeOut,
    sortOrder, ignoredFolders, albumsViewMode, artistsViewMode,
    showPlaybackControls,
    rescanFrequency,
  } = state;
  return {
    hapticsEnabled, reduceMotion, gestureSensitivity, miniPlayerStyle, swipeBehavior,
    syncedLyrics, autoScrollLyrics, lyricsFontSize, lyricsBlurIntensity, lyricsBackground,
    gaplessPlayback, playbackSpeed, resumeOnHeadphones, autoplayBluetooth, rememberQueue, resumeLastSession,
    sleepDefaultMinutes, sleepFadeOut,
    sortOrder, ignoredFolders, albumsViewMode, artistsViewMode,
    showPlaybackControls,
    rescanFrequency,
  };
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  set: (key, value) => {
    set({ [key]: value } as Pick<SettingsStore, typeof key>);
    persist(pickData(get()));
  },

  reset: () => {
    set({ ...DEFAULT_SETTINGS });
    persist(DEFAULT_SETTINGS);
  },

  hydrate: () => {
    try {
      const json = storage.getString(SETTINGS_KEY);
      const stored = json ? (JSON.parse(json) as Partial<SettingsData>) : {};
      // Merge over defaults so newly-added settings get their default value.
      set({ ...DEFAULT_SETTINGS, ...stored, hydrated: true });
    } catch (error) {
      console.error('[settingsStore] Failed to hydrate settings', error);
      set({ ...DEFAULT_SETTINGS, hydrated: true });
    }
  },
}));
