# PRD — Offline Music Player (Expo / React Native)

**Version:** 2.0 (Revised — Architecture-Hardened)
**Stack:** Expo · React Native · TypeScript · Expo Router · react-native-track-player · Reanimated · Zustand

---

## Table of Contents

1. [Product Vision & Scope Split](#1-product-vision--scope-split)
2. [Design System](#2-design-system)
3. [Data Models](#3-data-models)
4. [Architecture & Folder Structure](#4-architecture--folder-structure)
5. [State Management (Zustand)](#5-state-management-zustand)
6. [Services Layer](#6-services-layer)
7. [Audio Focus & Interruption Handling](#7-audio-focus--interruption-handling)
8. [Playback Persistence Strategy](#8-playback-persistence-strategy)
9. [Search Index Strategy](#9-search-index-strategy)
10. [Performance & Rendering Rules](#10-performance--rendering-rules)
11. [Screens & Navigation](#11-screens--navigation)
12. [Component Library](#12-component-library)
13. [Animation System — V1 Scope Only](#13-animation-system--v1-scope-only)
14. [Permissions & Error Handling](#14-permissions--error-handling)
15. [Step-by-Step Build Workflow](#15-step-by-step-build-workflow)

---

## 1. Product Vision & Scope Split

A **premium offline music player** for Android and iOS. All playback is local. No streaming, no accounts, no network.

### Why This Document Splits V1 and V2

The previous version tried to ship Spotify-level animations alongside core infrastructure in a single phase. That is a trap. Gesture conflicts, Reanimated debugging, and Android inconsistencies will consume weeks if attempted before the audio foundation is solid.

**The priority order is:**

```
Reliable audio > Stable state > Correct persistence > Clean UI > Polish animations
```

A broken player with beautiful animations is worthless. A boring player that never crashes is shippable.

---

### V1 Scope — Build This First

| Area        | What's In                                                      |
| ----------- | -------------------------------------------------------------- |
| Playback    | Play, pause, next, prev, seek, shuffle, repeat                 |
| Queue       | Full queue management + drag reorder                           |
| Player UI   | MiniPlayer + ExpandedPlayer (no shared element transition yet) |
| Library     | Songs, Albums, Artists, Playlists, Favorites, Recently Played  |
| Search      | Indexed in-memory search (fast even at 10k songs)              |
| Persistence | Queue, position, and library state survive app kill            |
| Audio Focus | Call interruption, headphone unplug, Bluetooth routing         |
| Animations  | Entrance animations, play/pause feedback, simple player open   |
| Scanner     | Paginated, incremental, duplicate-safe Android scanner         |

### V2 Scope — Do Not Build Yet

| Area                             | Why Deferred                                                           |
| -------------------------------- | ---------------------------------------------------------------------- |
| Shared element player transition | Requires Reanimated layout animations + navigation sync — high risk    |
| Artwork blur backgrounds         | Expensive on low-end Android — needs device capability detection first |
| Cinematic gesture system         | Gesture conflicts with navigation are hard to debug                    |
| Equalizer screen                 | Platform-specific DSP APIs — separate project                          |
| Advanced micro-interactions      | Every extra animated node has a cost — add after profiling             |
| Lyrics screen                    | Requires either LRC parsing or an API — out of offline scope           |

---

## 2. Design System

### 2.1 Color Palette — 4 Colors Only

| Token          | Hex       | Usage                                                    |
| -------------- | --------- | -------------------------------------------------------- |
| `COLOR_WHITE`  | `#F5F5F5` | Primary text, active icons, play button icon             |
| `COLOR_BLACK`  | `#0A0A0A` | App background, deepest surfaces                         |
| `COLOR_GREY_1` | `#1C1C1E` | Card backgrounds, bottom sheets, elevated surfaces       |
| `COLOR_GREY_2` | `#3A3A3C` | Secondary text, inactive icons, dividers, progress track |

**Rule:** No other colors exist in the codebase. Artwork is the only source of accent color anywhere in the UI. No gradients, no tints, no brand colors.

```ts
// constants/colors.ts
export const Colors = {
  white: "#F5F5F5",
  black: "#0A0A0A",
  grey1: "#1C1C1E",
  grey2: "#3A3A3C",
} as const;
```

### 2.2 Typography

```ts
// constants/typography.ts
export const Typography = {
  displayLarge: {
    fontSize: 32,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 24,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  title: { fontSize: 18, fontWeight: "600" as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: "400" as const, letterSpacing: 0 },
  caption: { fontSize: 12, fontWeight: "400" as const, letterSpacing: 0.2 },
  label: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.8 },
};
```

### 2.3 Spacing & Radius

```ts
// constants/spacing.ts
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

// constants/radius.ts
export const Radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };
```

### 2.4 Shadows

Black-only shadows. No colored shadows.

```ts
// constants/shadow.ts
export const Shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  player: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
};
```

---

## 3. Data Models

```ts
// types/index.ts

export interface Song {
  id: string; // MediaLibrary asset id — stable across scans
  title: string;
  artist: string;
  album: string;
  artwork?: string; // Local file URI or undefined — never a remote URL
  duration: number; // Seconds (float)
  uri: string; // Local file URI
  dateAdded: number; // Timestamp — used for Recently Played sort
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[]; // References Song.id ONLY — never embed full Song objects
  createdAt: number;
  updatedAt: number;
}

// QueueItem deliberately extends Song with its own identity.
// This allows the same song to appear multiple times in a queue.
export interface QueueItem extends Song {
  queueId: string; // uuid — unique per slot, not per song
}

export type RepeatMode = "off" | "track" | "queue";
export type PlaybackState =
  | "playing"
  | "paused"
  | "loading"
  | "stopped"
  | "error";

// Persisted playback snapshot — written to AsyncStorage on state change
export interface PlaybackSnapshot {
  queueSongIds: string[]; // Ordered list of Song.id
  queueIndex: number;
  progressSeconds: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  savedAt: number; // Timestamp — reject snapshots older than 7 days
}
```

---

## 4. Architecture & Folder Structure

```
app/
  (tabs)/
    index.tsx             ← Home
    search.tsx            ← Search
    library.tsx           ← Library
    settings.tsx          ← Settings
    _layout.tsx           ← Tab navigator
  player.tsx              ← Expanded player (modal)
  playlist/[id].tsx       ← Playlist detail
  queue.tsx               ← Queue manager
  _layout.tsx             ← Root layout — TrackPlayer init, hydration
  service.ts              ← TrackPlayer background service (required by RNTP)

components/
  player/
    MiniPlayer.tsx
    ExpandedPlayer.tsx
    PlaybackControls.tsx
    ProgressBar.tsx
    ArtworkView.tsx
    QueueItem.tsx
    EqualizerBars.tsx     ← Animated bars for active-song indicator only
  library/
    SongCard.tsx
    AlbumCard.tsx
    ArtistCard.tsx
    PlaylistCard.tsx
  shared/
    SearchBar.tsx
    BottomSheetMenu.tsx
    IconButton.tsx
    Skeleton.tsx
    EmptyState.tsx

store/
  playerStore.ts          ← Current track, state, queue, modes
  libraryStore.ts         ← Songs, playlists, favorites, recent
  uiStore.ts              ← Player open state, active sheet

services/
  TrackPlayerService.ts   ← RNTP setup, capabilities, load/play, event sync
  MediaScannerService.ts  ← Paginated Android-safe scanner
  StorageService.ts       ← Typed AsyncStorage wrapper
  PlaylistService.ts      ← Playlist CRUD
  AudioFocusService.ts    ← Interruption + routing event handlers

hooks/
  usePlayer.ts            ← Playback actions + RNTP event subscriptions
  useLibrary.ts           ← Library selectors
  useSearch.ts            ← Indexed search with debounce
  useAnimatedPlayer.ts    ← V1: simple open/close values only

animations/
  springConfigs.ts        ← Reanimated spring presets (4 defined)

constants/
  colors.ts
  typography.ts
  spacing.ts
  radius.ts
  shadow.ts
  index.ts                ← Re-exports all

utils/
  formatDuration.ts       ← seconds → m:ss
  generateId.ts           ← uuid wrapper
  debounce.ts
  clamp.ts
  buildSearchIndex.ts     ← Normalizes songs into SearchIndex

assets/
  fonts/
  images/
    defaultArtwork.png   ← Fallback — must be local, never remote
```

---

## 5. State Management (Zustand)

### 5.1 Player Store

```ts
// store/playerStore.ts
interface PlayerStore {
  currentTrack: Song | null;
  playbackState: PlaybackState;
  progress: number; // 0–1 normalized
  duration: number; // Seconds
  queue: QueueItem[];
  queueIndex: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;

  setCurrentTrack: (song: Song | null) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setProgress: (value: number) => void;
  setDuration: (value: number) => void;
  setQueue: (songs: Song[]) => void;
  addToQueue: (song: Song) => void;
  addNext: (song: Song) => void;
  removeFromQueue: (queueId: string) => void;
  reorderQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  setQueueIndex: (index: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
}
```

### 5.2 Library Store

```ts
// store/libraryStore.ts
interface LibraryStore {
  songs: Song[];
  playlists: Playlist[];
  favorites: Set<string>; // Song IDs
  recentlyPlayed: string[]; // Song IDs, max 50, front = most recent
  isScanning: boolean;
  scanProgress: number; // 0–1, for progress indicator during large scans
  lastScanned: number | null;

  setSongs: (songs: Song[]) => void;
  setScanning: (value: boolean) => void;
  setScanProgress: (value: number) => void;
  addPlaylist: (playlist: Playlist) => void;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;
  toggleFavorite: (songId: string) => void;
  addRecentlyPlayed: (songId: string) => void; // deduplicates + trims to 50
  hydrate: () => Promise<void>; // load from AsyncStorage
  persist: () => Promise<void>; // write to AsyncStorage
}
```

### 5.3 UI Store

```ts
// store/uiStore.ts
interface UIStore {
  playerExpanded: boolean;
  activeBottomSheet: string | null;
  setPlayerExpanded: (value: boolean) => void;
  openBottomSheet: (id: string) => void;
  closeBottomSheet: () => void;
}
```

---

## 6. Services Layer

### 6.1 TrackPlayerService

```ts
// services/TrackPlayerService.ts

// Responsibilities:
//   - Call TrackPlayer.setupPlayer() once at startup with audio session config
//   - Register capabilities for lock screen / notification controls
//   - Map Song → TrackPlayer Track (id, url, title, artist, artwork)
//   - loadAndPlay(songs, startIndex): clear queue → add tracks → play at index
//   - syncProgress(): subscribe to Progress events → playerStore
//   - syncState(): subscribe to PlaybackState events → playerStore
//   - syncTrack(): subscribe to TrackChanged events → playerStore

export async function setupTrackPlayer(): Promise<void>;
export async function loadAndPlay(
  songs: Song[],
  startIndex: number,
): Promise<void>;
export function startEventSync(): () => void; // returns unsubscribe function

// TrackPlayer capabilities to register:
//   Capability.Play, Capability.Pause, Capability.Stop
//   Capability.SkipToNext, Capability.SkipToPrevious
//   Capability.SeekTo
```

**Audio session configuration (iOS):**

```ts
await TrackPlayer.updateOptions({
  capabilities: [...],
  compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
  android: {
    appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
  },
})
```

### 6.2 MediaScannerService — Android-Safe Paginated Scanner

The naive approach of calling `MediaLibrary.getAssetsAsync()` once is NOT safe on Android for large libraries. It will block the JS thread, cause ANR-like freezes, and fail silently on some ROMs.

```ts
// services/MediaScannerService.ts

const PAGE_SIZE = 100; // Fetch 100 assets per batch
const SUPPORTED_EXTENSIONS = ["mp3", "wav", "flac", "m4a", "aac", "ogg"];

// Main entry point — always use this, not the helpers directly
export async function scanLocalMusic(
  onProgress?: (loaded: number, total: number) => void,
): Promise<Song[]>;

// Internal: fetches all audio assets in pages of PAGE_SIZE
// Never calls getAssetsAsync with no limit
async function fetchAllAudioAssets(): Promise<MediaLibrary.Asset[]>;

// Internal: maps a MediaLibrary.Asset to a Song
// - Uses filename as title fallback if metadata is missing
// - Uses 'Unknown Artist' / 'Unknown Album' for missing fields
// - Filters out assets whose URI no longer exists on disk
async function assetToSong(asset: MediaLibrary.Asset): Promise<Song | null>;

// Deduplication: compare incoming Song[] against cached Song[]
// Match by Song.id (asset id from MediaLibrary — stable)
// Returns: { added: Song[], removed: string[] }
export function diffLibrary(
  cached: Song[],
  fresh: Song[],
): { added: Song[]; removedIds: string[] };

// Permission request with full flow
export async function requestMediaPermissions(): Promise<
  "granted" | "denied" | "blocked"
>;
```

**Pagination implementation:**

```ts
async function fetchAllAudioAssets(): Promise<MediaLibrary.Asset[]> {
  const results: MediaLibrary.Asset[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: PAGE_SIZE,
      after: cursor,
    });
    results.push(...page.assets);
    hasMore = page.hasNextPage;
    cursor = page.endCursor;
    // Yield to JS event loop between pages to avoid blocking
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return results;
}
```

**Why pagination matters:**

- A library of 5,000 songs with no pagination will fetch 5,000 assets in one synchronous MediaLibrary call
- On a mid-range Android device this causes 2–4 second JS thread freezes
- Some Xiaomi and Samsung ROMs silently fail or return partial data without pagination
- The `await new Promise(resolve => setTimeout(resolve, 0))` between pages yields the event loop, preventing ANR

### 6.3 StorageService

```ts
// services/StorageService.ts

export const STORAGE_KEYS = {
  SONGS: "library:songs",
  PLAYLISTS: "library:playlists",
  FAVORITES: "library:favorites",
  RECENTLY_PLAYED: "library:recently_played",
  LAST_SCANNED: "library:last_scanned",
  PLAYBACK_SNAPSHOT: "player:snapshot", // PlaybackSnapshot — see Section 8
} as const;

export async function getItem<T>(key: string): Promise<T | null>;
export async function setItem<T>(key: string, value: T): Promise<void>;
export async function removeItem(key: string): Promise<void>;
export async function clearAll(): Promise<void>; // Settings screen: clear cache
```

### 6.4 PlaylistService

```ts
// services/PlaylistService.ts

export async function createPlaylist(name: string): Promise<Playlist>;
export async function renamePlaylist(id: string, name: string): Promise<void>;
export async function deletePlaylist(id: string): Promise<void>;
export async function addSongsToPlaylist(
  playlistId: string,
  songIds: string[],
): Promise<void>;
export async function removeSongFromPlaylist(
  playlistId: string,
  songId: string,
): Promise<void>;
export async function reorderSongsInPlaylist(
  playlistId: string,
  from: number,
  to: number,
): Promise<void>;

// All mutations call libraryStore.persist() after modifying state
```

### 6.5 AudioFocusService

This service is not optional. Without it, the app will behave unprofessionally on every device.

```ts
// services/AudioFocusService.ts

// react-native-track-player exposes Remote events for most of these.
// Register all handlers once in app/_layout.tsx after TrackPlayer setup.

export function registerAudioFocusHandlers(): () => void; // returns cleanup fn

// Handlers to register:

// 1. Remote.Duck
//    Triggered by: incoming notification sound, alarm, other app requests audio
//    Action: reduce volume to 0.3, do NOT pause
//    On unduck: restore volume to 1.0

// 2. Remote.Pause (system-initiated)
//    Triggered by: incoming call, assistant activation
//    Action: pause playback, save position snapshot

// 3. Remote.Play (system-initiated resume)
//    Triggered by: call ends, interruption resolves
//    Action: resume if we were the one who paused (track via flag)

// 4. Event.PlaybackActiveTrackChanged
//    Triggered by: track naturally ended
//    Action: handle repeat mode logic, update playerStore

// Headphone / audio route changes — requires native module or RNTP events:

// 5. Headphone unplug (AUDIO_BECOMING_NOISY on Android)
//    react-native-track-player handles this automatically IF:
//    android.alwaysPauseOnInterruption = true in TrackPlayer.updateOptions
//    Verify this is set.

// 6. Bluetooth device disconnect
//    Same as headphone unplug — handled by AUDIO_BECOMING_NOISY
//    Action: pause immediately
```

**Critical Android config:**

```ts
// In TrackPlayer.updateOptions():
android: {
  alwaysPauseOnInterruption: true,   // AUDIO_BECOMING_NOISY → auto pause
}
```

---

## 7. Audio Focus & Interruption Handling

This section defines the expected behavior matrix for every audio interruption. Implement and test each row before shipping.

| Event                               | Source             | Expected App Behavior                                               |
| ----------------------------------- | ------------------ | ------------------------------------------------------------------- |
| Incoming call                       | Android/iOS system | Pause immediately, save position snapshot                           |
| Call ends                           | System             | Resume if app was playing before call                               |
| Headphone unplug                    | Hardware event     | Pause immediately (never blast audio from speaker)                  |
| Bluetooth device disconnect         | Hardware event     | Pause immediately                                                   |
| Bluetooth device reconnect          | Hardware event     | Do NOT auto-resume — user must press play                           |
| Another app requests audio          | System             | Duck (reduce to 30% volume), not pause                              |
| Another app releases audio          | System             | Restore volume, do NOT auto-resume unless user was actively playing |
| Screen lock                         | OS                 | No behavior change — continue playing (background playback)         |
| App backgrounded                    | OS                 | No behavior change — continue playing                               |
| App killed by system                | OS                 | Save snapshot before death if possible via AppState listener        |
| Navigation audio (Google Maps etc.) | Ducking request    | Duck to 30%, restore after navigation prompt                        |

---

## 8. Playback Persistence Strategy

When the app is killed (by user or OS), playback state must be restorable.

### 8.1 What Gets Persisted

```ts
// Persisted as PlaybackSnapshot (see Data Models)
interface PlaybackSnapshot {
  queueSongIds: string[]; // In-order Song IDs
  queueIndex: number; // Which song was playing
  progressSeconds: number; // Position in that song
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  savedAt: number; // Timestamp — invalidate snapshots > 7 days old
}
```

### 8.2 When to Write the Snapshot

```
Write snapshot on:
  - Every track change
  - Every 10 seconds of playback (progress checkpoint)
  - AppState change: active → background
  - AppState change: active → inactive

Do NOT write snapshot on:
  - Every progress tick (too frequent — causes I/O thrashing)
  - App resume (read-only moment)
```

```ts
// Implementation pattern in usePlayer.ts
let lastSnapshotWrite = 0;
const SNAPSHOT_INTERVAL_MS = 10_000;

useTrackPlayerEvents([Event.PlaybackProgressUpdated], async (event) => {
  const now = Date.now();
  if (now - lastSnapshotWrite > SNAPSHOT_INTERVAL_MS) {
    await writePlaybackSnapshot();
    lastSnapshotWrite = now;
  }
});
```

### 8.3 Restore Flow on App Launch

```
App launch sequence:
  1. setupTrackPlayer()
  2. libraryStore.hydrate()        ← loads songs, playlists, favorites
  3. restorePlaybackSnapshot()     ← described below
  4. Render UI

restorePlaybackSnapshot():
  1. Read PlaybackSnapshot from AsyncStorage
  2. If null → no-op, start fresh
  3. If savedAt > 7 days ago → discard, start fresh
  4. Resolve Song objects from snapshot.queueSongIds
     - Filter out any song IDs no longer in libraryStore.songs
     - If resolved queue is empty → discard snapshot
  5. Call TrackPlayer.add(resolvedTracks)
  6. Call TrackPlayer.skip(snapshot.queueIndex)
  7. Call TrackPlayer.seekTo(snapshot.progressSeconds)
  8. DO NOT auto-play — user must press play
     Rationale: auto-play on cold start is unexpected and annoying
  9. Update playerStore with restored state
```

### 8.4 Edge Cases

| Scenario                                     | Behavior                                    |
| -------------------------------------------- | ------------------------------------------- |
| Song file deleted since last session         | Skip that song during restore, shrink queue |
| All queued songs deleted                     | Show empty player, no error                 |
| Snapshot corrupt / unparseable               | Discard silently, start fresh               |
| Queue index out of bounds after song removal | Clamp to last valid index                   |
| Snapshot > 7 days old                        | Discard — stale context is confusing        |

---

## 9. Search Index Strategy

### 9.1 Why In-Memory Search Needs an Index

Naive in-memory search on 10,000 songs:

```ts
// BAD — runs on every keystroke, O(n) per character
songs.filter(
  (s) =>
    s.title.toLowerCase().includes(query) ||
    s.artist.toLowerCase().includes(query),
);
```

On a low-end Android with 8,000 songs this causes 50–120ms stutter per keystroke. Perceptibly laggy.

### 9.2 Search Index Structure

```ts
// utils/buildSearchIndex.ts

export interface SearchIndex {
  // Map from normalized token to Song IDs that contain it
  // Built once after scan, rebuilt after rescan
  tokens: Map<string, Set<string>>;
  // Denormalized lookup: Song ID → Song (avoids array search during render)
  songById: Map<string, Song>;
}

export function buildSearchIndex(songs: Song[]): SearchIndex {
  const tokens = new Map<string, Set<string>>();
  const songById = new Map<string, Song>();

  for (const song of songs) {
    songById.set(song.id, song);
    // Tokenize: split on spaces, lowercase, remove punctuation
    const terms = tokenize(`${song.title} ${song.artist} ${song.album}`);
    for (const term of terms) {
      if (!tokens.has(term)) tokens.set(term, new Set());
      tokens.get(term)!.add(song.id);
    }
  }
  return { tokens, songById };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}
```

### 9.3 Query Execution

```ts
// hooks/useSearch.ts

export function useSearch(query: string): Song[] {
  const index = useLibraryStore((s) => s.searchIndex);

  return useMemo(() => {
    if (!query || query.trim().length < 2) return [];

    const terms = tokenize(query);
    if (terms.length === 0) return [];

    // Intersection: song must match ALL query terms
    const [first, ...rest] = terms;
    let matchIds: Set<string> = new Set(index.tokens.get(first) ?? []);

    for (const term of rest) {
      const termIds = index.tokens.get(term) ?? new Set();
      matchIds = new Set([...matchIds].filter((id) => termIds.has(id)));
    }

    return [...matchIds]
      .map((id) => index.songById.get(id)!)
      .filter(Boolean)
      .slice(0, 100); // Cap results — never render more than 100 at once
  }, [query, index]);
}
```

### 9.4 When to Build/Rebuild the Index

```
Build index:
  - After initial media scan completes
  - After rescan (full rebuild, not incremental)

Store index:
  - In libraryStore as a non-persisted field (rebuild on every cold start)
  - Index is derived from songs array — do NOT serialize to AsyncStorage
  - It's fast to rebuild (< 200ms for 10k songs) and large to serialize

Debounce search input: 150ms
Minimum query length: 2 characters
```

---

## 10. Performance & Rendering Rules

### 10.1 List Rendering

```
ALWAYS use FlashList (not FlatList) for any list with > 20 items.
Set estimatedItemSize accurately — measure actual rendered heights.
SongCard estimated height: 72
AlbumCard estimated height: 80
PlaylistCard estimated height: 72

NEVER:
  - Put animated values inside FlashList item renders
  - Use blurRadius on per-item artwork in lists (only full-screen player)
  - Render gradients inside list items
  - Use heavy shadows (elevation > 4) on list items

OK:
  - Static artwork in list items (expo-image handles caching)
  - Opacity-based active state on current song
  - Simple scale animation on press (starts after press, not during scroll)
```

### 10.2 Reanimated Rules

```
All animation worklets MUST run on the UI thread.
Use runOnJS() only for state updates that cannot run on UI thread.
Never read JS state inside a worklet — pass values in via useSharedValue or props.

Animated components:
  - Use Animated.View, not View, only where the component actually animates
  - Every animated node has a render cost — do not wrap static elements

Gesture conflicts:
  - Expanded player swipe-down gesture must use activeOffsetY to avoid
    conflicting with internal ScrollView or FlashList scroll
  - Test on Android specifically — gesture handler behavior differs from iOS
```

### 10.3 Artwork Blur (Expanded Player Only)

The `AnimatedBackground` component (blurred artwork) is expensive.

```
Rules:
  - Only render AnimatedBackground in ExpandedPlayer, nowhere else
  - Use expo-image with blurRadius prop (GPU-accelerated on iOS)
  - On Android: test on a low-end device (2GB RAM). If FPS drops below 50,
    replace with a solid COLOR_GREY_1 background and remove blur entirely
  - Do NOT animate the blur radius — set it statically
  - Cache strategy: artwork URI only changes on track change, not on every render
    Use React.memo with uri comparison to prevent re-blur on re-renders

Detection (future V2):
  - Use DeviceInfo to check total RAM
  - If RAM < 3GB, skip blur and use solid background
```

### 10.4 Memoization Rules

```ts
// Memoize all list item components
export const SongCard = React.memo(SongCardComponent, (prev, next) => {
  return prev.song.id === next.song.id && prev.isPlaying === next.isPlaying;
});

// Memoize all callbacks passed to list items
const handleSongPress = useCallback(
  (song: Song) => {
    playFromLibrary(song, songs);
  },
  [songs],
);

// Zustand: always use selectors, never subscribe to the whole store
const currentTrack = usePlayerStore((s) => s.currentTrack); // ✓
const store = usePlayerStore(); // ✗ — re-renders on any change
```

### 10.5 Performance Targets

| Metric                      | Target                   | Hard Limit              |
| --------------------------- | ------------------------ | ----------------------- |
| Animation frame rate        | 60 FPS                   | Never drop below 45 FPS |
| Search response (10k songs) | < 50ms after index built | < 150ms                 |
| Cold start to interactive   | < 3 seconds              | < 5 seconds             |
| Scan time: 1,000 songs      | < 8 seconds              | < 15 seconds            |
| Library support             | 5,000+ songs             | 15,000+ songs           |
| Memory (idle, 5k library)   | < 150MB                  | < 250MB                 |

---

## 11. Screens & Navigation

### 11.1 Navigation Structure

```
Root Stack (_layout.tsx)
  ├── (tabs)/ — Bottom Tab Navigator
  │     ├── Home (index.tsx)
  │     ├── Search (search.tsx)
  │     ├── Library (library.tsx)
  │     └── Settings (settings.tsx)
  ├── player        — Modal (presentation: 'modal')
  ├── queue         — Stack push
  └── playlist/[id] — Stack push
```

### 11.2 Home Screen

**Sections:**

1. Header — app name + manual rescan button (icon)
2. Recently Played — horizontal FlashList, compact SongCard, shows last 10
3. Favorites — horizontal FlashList, compact SongCard (hidden if empty)
4. All Songs — vertical FlashList, full SongCard, sorted by title

**Scan flow:**

- On first launch: show full-screen scan state with progress bar
- On rescan: inline banner showing progress, list stays visible
- On empty library: EmptyState with "Grant Access" CTA

### 11.3 Search Screen

**Layout:**

1. SearchBar (autofocused on tab focus)
2. Segment control: Songs / Albums / Artists
3. FlashList of results

**Behavior:**

- Uses `useSearch` hook (indexed, debounced 150ms)
- Minimum 2 characters before search fires
- Tap song → `loadAndPlay([song], 0)` — single song queue
- Long press → BottomSheetMenu

### 11.4 Library Screen

**Sub-tabs:** Songs · Albums · Artists · Playlists · Favorites

- Songs: full FlashList sorted alphabetically
- Albums: grouped by `song.album`, show `AlbumCard` (artwork + name + count)
- Artists: grouped by `song.artist`, show `ArtistCard` (name + song count)
- Playlists: `PlaylistCard` list + "New Playlist" button at top
- Favorites: `SongCard` list filtered by `libraryStore.favorites`

### 11.5 Settings Screen

- Rescan library (manual)
- Last scanned: shows timestamp
- Library stats: X songs, X albums, X artists
- Clear all data (with confirmation)
- App version

### 11.6 Expanded Player Screen

**Layout (top to bottom):**

1. Dismiss handle (32px touch target centered)
2. Artwork — 80% screen width, square, rounded corners (Radius.lg), shadow
3. Track title (truncate after 1 line, marquee scroll if overflowing — V2)
4. Artist name (truncate, 1 line, COLOR_GREY_2)
5. Favorite toggle button (top-right of track info row)
6. ProgressBar with elapsed / remaining labels
7. PlaybackControls row
8. Bottom row: Queue button (left) | Volume (center or right)

**Background:**

- V1: solid COLOR_BLACK with a static blurred artwork behind at low opacity
- No animated background changes on track change in V1 (just update the URI)

### 11.7 Queue Screen

**Layout:**

1. Header: "Queue" + song count + Clear button
2. Current track section (highlighted, non-draggable)
3. Up next: draggable FlashList of QueueItems
4. Drag reorder using react-native-draggable-flatlist

### 11.8 Playlist Detail

**Layout:**

1. Header: playlist name + "X songs"
2. Action bar: Play All, Shuffle, Add Songs, Delete playlist
3. FlashList of SongCard with remove-from-playlist option on long press

---

## 12. Component Library

### 12.1 MiniPlayer

```
Position: absolute, bottom = tabBarHeight + 8
Width: screenWidth - 32 (16px margin each side)
Height: 64px
Background: COLOR_GREY_1
Border radius: Radius.lg
Shadow: Shadow.player

Layout (left → right):
  [8px] [Artwork 48px, radius 8] [12px] [Title+Artist column, flex 1] [8px] [Play/Pause 40px] [Next 40px] [8px]

Visibility:
  - Only rendered when currentTrack !== null
  - Entrance: translateY from 80 to 0, opacity 0 to 1 (spring: gentle)
  - Exit: reverse of entrance

Gestures (V1):
  - Tap anywhere → navigate('/player')
  - Swipe left → next track (horizontal pan > 80px velocity > 500)

Gestures (V2 — defer):
  - Swipe up → expand with shared element
  - Swipe right → prev track
```

### 12.2 ArtworkView

```ts
interface ArtworkViewProps {
  uri?: string;
  size: number;
  borderRadius?: number;
}
// Uses expo-image — automatic LRU caching
// Shows defaultArtwork.png on undefined or load error
// 1px border: COLOR_GREY_2 at 40% opacity
// NO rotation animation in V1
```

### 12.3 ProgressBar

```ts
interface ProgressBarProps {
  progress: number; // 0–1
  duration: number; // Seconds
  onSeek: (seconds: number) => void;
}
// Track: COLOR_GREY_2, 3px height
// Fill: COLOR_WHITE, 3px height
// Thumb: COLOR_WHITE circle, 14px, visible only during active pan gesture
// Gesture: PanGestureHandler
//   - onStart: show thumb
//   - onActive: update display position (do NOT call TrackPlayer.seekTo yet)
//   - onEnd: call TrackPlayer.seekTo with final value, hide thumb
// Elapsed label (left): COLOR_GREY_2, caption style
// Remaining label (right): COLOR_GREY_2, caption style, prefixed with "-"
```

### 12.4 PlaybackControls

```
Layout: [Shuffle 36px] [Prev 48px] [Play/Pause 72px] [Next 48px] [Repeat 36px]

Play/Pause:
  - 72px circle
  - Background: COLOR_WHITE
  - Icon: COLOR_BLACK
  - onPressIn: scale to 0.92 (spring: snappy)
  - onPressOut: scale to 1.0 (spring: snappy)

Prev:
  - Single tap: previous track (if progress > 3s: restart current track first)
  - Double tap: always go to previous track

Shuffle:
  - Active: COLOR_WHITE, opacity 1.0
  - Inactive: COLOR_GREY_2, opacity 0.5

Repeat cycles: off → queue → track → off
  - Visual indicator: small dot below icon when track-repeat active
```

### 12.5 SongCard

```ts
interface SongCardProps {
  song: Song;
  onPress: () => void;
  onLongPress?: () => void;
  isPlaying?: boolean;
  compact?: boolean;
}
// Default height: 72px
// Compact height: 56px (horizontal lists)
// isPlaying: title color = COLOR_WHITE + show EqualizerBars (3 animated bars)
// Inactive: title COLOR_WHITE, artist COLOR_GREY_2
// Press state: opacity 0.6 on press in
// Memoized: re-renders only when song.id or isPlaying changes
```

### 12.6 EqualizerBars (active song indicator only)

```ts
// components/player/EqualizerBars.tsx
// 3 vertical bars, each with independent height animation
// Heights oscillate: bar1: 4↔14px (400ms), bar2: 6↔12px (600ms), bar3: 4↔16px (500ms)
// Using withRepeat(withSequence(withTiming(...), withTiming(...)))
// Color: COLOR_WHITE
// Width per bar: 3px, gap: 3px
// Only rendered when isPlaying === true
// Pause-states: freeze at current height (not rendered when paused → use isPlaying prop)
```

### 12.7 BottomSheetMenu

Using `@gorhom/bottom-sheet`.

**Song context menu options:**

- Play Now
- Play Next (add as next in queue)
- Add to Queue (add to end)
- Add to Playlist (opens sub-sheet with playlist list)
- Remove from Playlist (only when in playlist context)
- Favorite / Unfavorite
- Go to Album
- Go to Artist

### 12.8 SearchBar

```ts
// Background: COLOR_GREY_1, height 44px, radius Radius.full
// Left icon: search, COLOR_GREY_2
// Right icon: clear button, appears when text.length > 0
// autoCapitalize: "none"
// returnKeyType: "search"
// clearButtonMode: "never" (use custom clear button for consistency)
```

### 12.9 EmptyState

```ts
interface EmptyStateProps {
  icon: string; // Icon name
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}
// Used for: no songs found, no search results, empty playlist, permission denied
```

### 12.10 Skeleton

```ts
// Animated shimmer: COLOR_GREY_1 → COLOR_GREY_2 → COLOR_GREY_1
// Duration: 1200ms, withRepeat(-1), withTiming + interpolation
// Use for: song list loading, library sections loading during scan
```

---

## 13. Animation System — V1 Scope Only

**V1 animation budget: simple, reliable, fast. No shared element transitions. No blur animations. No complex gesture chains.**

### 13.1 Spring Presets

```ts
// animations/springConfigs.ts
export const Springs = {
  snappy: { damping: 20, stiffness: 300, mass: 0.8 }, // button press
  gentle: { damping: 28, stiffness: 180, mass: 1.0 }, // MiniPlayer entrance
  bouncy: { damping: 14, stiffness: 260, mass: 0.9 }, // tab icon
  slow: { damping: 35, stiffness: 120, mass: 1.2 }, // player open
};
```

### 13.2 V1 Animations (implement these)

| Component               | Animation                                  | Config                  |
| ----------------------- | ------------------------------------------ | ----------------------- |
| MiniPlayer mount        | translateY 80→0, opacity 0→1               | gentle spring           |
| MiniPlayer unmount      | translateY 0→80, opacity 1→0               | snappy spring           |
| Play/Pause button press | scale 1→0.92→1                             | snappy spring           |
| Favorite toggle         | scale 1→1.3→1                              | bouncy spring           |
| Tab icon active         | scale 0.9→1.05→1                           | bouncy spring           |
| Expanded player open    | opacity 0→1, translateY 40→0               | slow spring             |
| Song card press         | opacity 1→0.6 on pressIn                   | immediate               |
| Skeleton shimmer        | opacity cycle                              | withRepeat withTiming   |
| Equalizer bars          | height oscillation                         | withRepeat withSequence |
| List entrance           | translateY 12→0, opacity 0→1, stagger 40ms | gentle spring           |

### 13.3 V1 Animations (do NOT implement yet)

```
✗ Shared element player expansion (MiniPlayer → ExpandedPlayer)
✗ Animated artwork blur changes on track switch
✗ Parallax artwork in player
✗ Gesture-driven player dismissal with spring rubber-band
✗ Swipe-to-delete on queue items with layout animation
✗ Reanimated layout animations on list reorder
```

These are deferred to V2. They require significant debugging time on Android, and they are not worth the risk before the audio foundation is solid.

### 13.4 Player Open/Close (V1)

In V1, opening the Expanded Player is a standard navigation push with a simple fade+slide. No shared element.

```ts
// app/(tabs)/_layout.tsx and app/player.tsx
// Use Expo Router modal presentation with custom animation
// Animated.timing: opacity 0→1 (200ms), translateY 50→0 (200ms), ease out
// Close: swipe down OR back button → navigation.goBack()
// No gesture-synchronized expansion in V1
```

---

## 14. Permissions & Error Handling

### 14.1 Permission Flow

```
Android 13+: READ_MEDIA_AUDIO
Android 10–12: READ_EXTERNAL_STORAGE
iOS: NSAppleMusicUsageDescription (add to Info.plist)
Notification: POST_NOTIFICATIONS (Android 13+) — for playback notification

Flow:
  1. On app launch, check current permission status
  2. If granted → scan
  3. If not_determined → show rationale screen → request
  4. If denied (can re-request) → show rationale again → request
  5. If blocked (system settings required) → show "Open Settings" button
  6. Never crash if permission denied — show EmptyState
```

### 14.2 Error Handling Matrix

| Error                    | Detection                                      | Response                                                    |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------- |
| Missing artwork          | `uri` is null or undefined                     | Show `defaultArtwork.png` silently                         |
| Corrupted audio file     | TrackPlayer `PlaybackError` event              | Skip to next, mark song `error: true` in store              |
| File moved or deleted    | TrackPlayer error on load                      | Remove from library on next scan; skip during queue restore |
| Unsupported format       | Extension filter in scanner                    | Skip silently                                               |
| Permission denied        | `requestMediaPermissions()` returns `'denied'` | Show permission UI                                          |
| Empty library after scan | `songs.length === 0`                           | Show EmptyState with rescan and permissions help            |
| Scanner throws           | try/catch in `scanLocalMusic`                  | Show error toast, keep cached song list                     |
| Snapshot restore fails   | try/catch in restore function                  | Discard snapshot, start fresh silently                      |
| AsyncStorage write fails | catch in `setItem`                             | Log only — do not crash                                     |
| TrackPlayer setup fails  | catch in `setupTrackPlayer`                    | Show critical error screen — app cannot function            |

**Hard rule: The app must never crash because of a media file. Every playback error is caught, handled, and skipped.**

---

## 15. Step-by-Step Build Workflow

Each step has a single clear deliverable and a **Verify** test. Do not proceed to the next step until the current Verify passes.

---

### PHASE 1 — Foundation (Steps 1–7)

> Goal: Project runs, navigates, TrackPlayer is initialized, media is scannable, state is persisted.

---

#### Step 1 — Project Setup & Dependencies

```bash
npx create-expo-app@latest . --template blank-typescript

npx expo install expo-router expo-media-library expo-image
npx expo install react-native-track-player
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install @gorhom/bottom-sheet
npx expo install react-native-safe-area-context react-native-screens
npx expo install @react-native-async-storage/async-storage
npm install zustand
npm install @shopify/flash-list
npm install react-native-draggable-flatlist
npm install uuid
npm install --save-dev @types/uuid
```

**Config checklist:**

- [ ] `app.json`: set `scheme`, `android.permissions` (READ_MEDIA_AUDIO, POST_NOTIFICATIONS), `ios.infoPlist.NSAppleMusicUsageDescription`
- [ ] `babel.config.js`: add `react-native-reanimated/plugin` to plugins array (must be last)
- [ ] `metro.config.js`: configure for Expo Router
- [ ] TypeScript `strict: true` in `tsconfig.json`
- [ ] All folders from the Architecture section created (empty index files ok)
- [ ] `app/service.ts` created with empty playback service export (required by RNTP even if empty)

**Verify:** `npx expo start` — app opens without red screen or TypeScript errors.

---

#### Step 2 — Constants & Design Tokens

Create all token files:

- [ ] `constants/colors.ts` — 4 color tokens
- [ ] `constants/typography.ts` — all text style objects
- [ ] `constants/spacing.ts`
- [ ] `constants/radius.ts`
- [ ] `constants/shadow.ts`
- [ ] `constants/index.ts` — re-exports all above

**Verify:** Create a throwaway `TestScreen.tsx`, import all constants, render a `<Text>` using `Typography.title` with `Colors.white` on a `Colors.black` background. No TypeScript errors.

---

#### Step 3 — Navigation Shell

- [ ] `app/_layout.tsx`: SafeAreaProvider + GestureHandlerRootView + Stack navigator with `player` as modal
- [ ] `app/(tabs)/_layout.tsx`: Bottom Tab navigator — 4 tabs, styled per Design System
- [ ] Stub files for all 4 tab screens (just `<Text>Screen Name</Text>`)
- [ ] `app/player.tsx`: stub
- [ ] `app/queue.tsx`: stub
- [ ] `app/playlist/[id].tsx`: stub

**Verify:** All 4 tabs navigate without crash. Navigating to `/player` from a test button opens modal and back/dismiss closes it.

---

#### Step 4 — Zustand Stores (Structure Only)

Create all three stores with correct types and stub implementations (actions can be no-ops for now):

- [ ] `store/playerStore.ts`
- [ ] `store/libraryStore.ts` (include `hydrate` and `persist` as async no-ops for now)
- [ ] `store/uiStore.ts`

**Verify:** Import each store in a screen component, call a setter, read it back. No TypeScript errors. Zustand DevTools visible (install if needed).

---

#### Step 5 — Storage Service

- [ ] `services/StorageService.ts`: typed wrapper + `STORAGE_KEYS` constants
- [ ] Implement `libraryStore.hydrate()`: reads songs, playlists, favorites, recently played from AsyncStorage
- [ ] Implement `libraryStore.persist()`: writes the same keys
- [ ] Call `hydrate()` in `app/_layout.tsx` useEffect

**Verify:** Set `songs` in libraryStore, call `persist()`. Kill and relaunch app. Call `hydrate()`. `songs` is restored. Log to console to confirm.

---

#### Step 6 — TrackPlayer Setup

- [ ] `services/TrackPlayerService.ts`: `setupTrackPlayer()` with all capabilities and Android `alwaysPauseOnInterruption: true`
- [ ] `app/service.ts`: basic TrackPlayer background service (required by RNTP — can be minimal)
- [ ] Register service in `app.json` under `plugins` or `android` service config
- [ ] Call `setupTrackPlayer()` in `app/_layout.tsx` useEffect (after storage hydration)
- [ ] `loadAndPlay(songs, startIndex)`: clears queue, adds mapped tracks, plays

**Verify:** On a physical device — call `loadAndPlay` with a hardcoded local audio file URI. Audio plays. Lock screen shows notification with controls. Play/pause notification button works.

---

#### Step 7 — Media Scanner (Paginated)

- [ ] `services/MediaScannerService.ts`: full paginated implementation per Section 6.2
- [ ] `requestMediaPermissions()`: full 3-state flow (granted / denied / blocked)
- [ ] `diffLibrary()`: returns added/removed diff
- [ ] Wire scanner to `libraryStore.setSongs()` and call `persist()` after
- [ ] Set `scanProgress` during scan for UI feedback
- [ ] Trigger scan from Home screen on first launch (check `libraryStore.lastScanned === null`)

**Verify:** On a physical Android device with local music files. Scanner runs without freezing, populates `libraryStore.songs`. Log song count. Test with 100+ files if available.

---

### PHASE 2 — Core Playback (Steps 8–12)

> Goal: Full playback loop — queue, controls, MiniPlayer, Expanded Player — all working reliably.

---

#### Step 8 — Playback Hook & Event Sync

- [ ] `hooks/usePlayer.ts`:
  - Subscribe to `Event.PlaybackProgressUpdated` → `playerStore.setProgress` and `setDuration`
  - Subscribe to `Event.PlaybackState` → `playerStore.setPlaybackState`
  - Subscribe to `Event.PlaybackActiveTrackChanged` → `playerStore.setCurrentTrack`
  - Expose actions: `play`, `pause`, `next`, `prev`, `seek`, `playFromLibrary(song, queue)`
- [ ] Call `usePlayer()` once at root layout — not per-screen

**Verify:** Call `playFromLibrary` with a song. `playerStore.currentTrack` updates. Progress increments. Pause/play toggles state correctly.

---

#### Step 9 — Audio Focus Handlers

- [ ] `services/AudioFocusService.ts`: `registerAudioFocusHandlers()` implementation per Section 6.5 and Section 7
- [ ] Call `registerAudioFocusHandlers()` in `app/_layout.tsx` after TrackPlayer setup
- [ ] Store returned cleanup function and call in layout unmount

**Verify:** Play a song. Plug in headphones, play, unplug — must pause. Play music, receive a call — must pause. Call ends — must resume. Test on physical Android device.

---

#### Step 10 — Playback Persistence

- [ ] `PlaybackSnapshot` type in `types/index.ts`
- [ ] `writePlaybackSnapshot()` utility — serializes queue + position to AsyncStorage
- [ ] Snapshot write triggers: track change + every 10 seconds + AppState background
- [ ] `restorePlaybackSnapshot()` in `app/_layout.tsx` — full restore flow per Section 8.3
- [ ] Edge cases handled: missing songs, corrupt data, stale snapshot

**Verify:** Start playing a song, seek to 1:30. Background the app. Kill it from recent apps. Relaunch. Player shows the same song, position is approximately 1:30, not playing (must not auto-play).

---

#### Step 11 — PlaybackControls + ProgressBar Components

- [ ] `components/player/PlaybackControls.tsx`: all 5 controls per Section 12.4
- [ ] `components/player/ProgressBar.tsx`: seek gesture, elapsed/remaining labels per Section 12.3
- [ ] `components/player/ArtworkView.tsx`: expo-image with fallback per Section 12.2
- [ ] `components/player/EqualizerBars.tsx`: 3-bar animation per Section 12.6

**Verify:** Render a test screen with all controls. Every button works. Seek scrubber moves correctly. Artwork fallback shows for undefined URI. Equalizer bars animate when `isPlaying={true}` and stop when `false`.

---

#### Step 12 — MiniPlayer

- [ ] `components/player/MiniPlayer.tsx`: full implementation per Section 12.1
- [ ] Mount in `app/(tabs)/_layout.tsx` — persists across all tabs
- [ ] Entrance animation: translateY + opacity spring
- [ ] Tap → navigate to `/player`
- [ ] Swipe left → next track

**Verify:** Play a song. MiniPlayer animates in. Tap play/pause — works. Navigate between all 4 tabs — MiniPlayer stays. Tap MiniPlayer → player screen opens. Swipe left → next song.

---

#### Step 13 — Expanded Player Screen

- [ ] `app/player.tsx`: full layout per Section 11.6
- [ ] V1 background: static blurred artwork (no animation on track change in V1)
- [ ] All controls wired to `usePlayer` hook
- [ ] Dismiss: back button + swipe-down gesture (simple, not spring-driven in V1)
- [ ] Queue and Settings shortcut buttons

**Verify:** Open player. All controls work. Background reflects current artwork. Changing track while player is open updates artwork and track info. Dismiss works.

---

#### Step 14 — Queue Screen

- [ ] `app/queue.tsx`: FlashList of QueueItem components
- [ ] Current track highlighted (COLOR_GREY_1 background)
- [ ] Drag to reorder using react-native-draggable-flatlist
- [ ] Tap item → skip to that queue index
- [ ] Remove item button (swipe or long press)
- [ ] Clear All button
- [ ] `components/player/QueueItem.tsx`

**Verify:** Play 5+ songs. Open queue. Current track is highlighted. Drag to reorder — order changes. Remove item — queue updates. Tap another item — playback skips to it. Clear all — queue empties.

---

### PHASE 3 — Library Features (Steps 15–20)

> Goal: Full library browsing, playlists, search, favorites, recently played.

---

#### Step 15 — Search Index

- [ ] `utils/buildSearchIndex.ts`: full token index implementation per Section 9.2
- [ ] `buildSearchIndex()` called in `libraryStore` after `setSongs()`
- [ ] Store index in `libraryStore` as a non-persisted computed field
- [ ] `hooks/useSearch.ts`: full indexed query per Section 9.3

**Verify:** Load 500+ songs. Open Search. Type a 3-letter query. Results appear in < 50ms (use console.time to measure). Intersection search: searching "john blue" returns songs with both "john" and "blue" in combined metadata.

---

#### Step 16 — Home Screen (Full)

- [ ] Recently Played horizontal FlashList (last 10, from `libraryStore.recentlyPlayed`)
- [ ] Favorites horizontal FlashList (hidden if empty)
- [ ] All Songs vertical FlashList with `SongCard`
- [ ] Skeleton during scan
- [ ] EmptyState with rescan CTA when no songs
- [ ] Tap song → `playFromLibrary(song, allSongs)` — sets all songs as queue

**Verify:** Screen renders all sections. Tap a song → playback starts, MiniPlayer appears. Recently Played updates as songs play.

---

#### Step 17 — Library Screen (Full)

- [ ] Songs tab: alphabetical FlashList
- [ ] Albums tab: grouped data, `AlbumCard` component
- [ ] Artists tab: grouped data, `ArtistCard` component
- [ ] Playlists tab: `PlaylistCard` + New Playlist button
- [ ] Favorites tab: filtered SongCard list
- [ ] Grouping logic in `useLibrary.ts` hook (memoized)

**Verify:** All 5 sub-tabs render correctly. Album/Artist grouping is accurate. Favorites tab is empty until a song is favorited.

---

#### Step 18 — Search Screen (Full)

- [ ] Segment control: Songs / Albums / Artists
- [ ] Results from `useSearch` hook
- [ ] EmptyState when no results
- [ ] Long press → BottomSheetMenu

**Verify:** Search returns results across all 3 categories. Switching segments filters correctly. Long press opens context menu.

---

#### Step 19 — Playlist System

- [ ] `services/PlaylistService.ts`: all CRUD functions
- [ ] Create playlist modal (BottomSheet with text input)
- [ ] `app/playlist/[id].tsx`: playlist detail screen
- [ ] Add to playlist from SongCard long-press context menu
- [ ] Remove from playlist in playlist detail context menu
- [ ] Delete playlist with confirmation dialog
- [ ] Playlists persisted via `libraryStore.persist()`

**Verify:** Create playlist. Add 3 songs from different screens. View playlist detail. Remove 1 song. Rename playlist. Delete playlist. All changes survive app restart.

---

#### Step 20 — Favorites & Recently Played

- [ ] Toggle favorite from BottomSheetMenu and ExpandedPlayer favorite button
- [ ] `libraryStore.addRecentlyPlayed()`: deduplicates, inserts at front, trims to 50
- [ ] Called in `usePlayer` on `Event.PlaybackActiveTrackChanged`
- [ ] Both persisted in AsyncStorage

**Verify:** Favorite 3 songs. Restart app — favorites persist. Play 5 different songs. Recently Played section on Home shows them in reverse play order.

---

### PHASE 4 — Animations & Polish (Steps 21–25)

> Goal: All V1 animations implemented, performance verified, error paths tested.

---

#### Step 21 — V1 Animations

Implement all animations from the V1 table in Section 13.2:

- [ ] MiniPlayer enter/exit spring animation
- [ ] Play/Pause button press scale
- [ ] Favorite toggle scale bounce
- [ ] Tab icon active animation
- [ ] Expanded player open fade+slide
- [ ] Song card press opacity
- [ ] List entrance stagger (cap at first 8 items)

**Verify:** Profile with React Native Debugger or Flipper. All animations run at 60 FPS. No JS thread warnings during animations.

---

#### Step 22 — BottomSheetMenu Polish

- [ ] `components/shared/BottomSheetMenu.tsx`: all context menu options per Section 12.7
- [ ] Add to Playlist sub-sheet (secondary BottomSheet)
- [ ] Spring animation on open (config from `@gorhom/bottom-sheet` springConfig)
- [ ] Backdrop press to dismiss

**Verify:** Long press any SongCard. Menu animates in. Every action works correctly. Nested playlist picker works. Backdrop dismiss works. No gesture conflicts with FlashList scroll.

---

#### Step 23 — Settings Screen (Full)

- [ ] Manual rescan with progress
- [ ] Last scanned timestamp
- [ ] Library statistics (song/album/artist counts)
- [ ] Clear all data with confirmation (AsyncStorage.clear + full store reset)
- [ ] App version from `expo-constants`

---

#### Step 24 — Performance Audit

- [ ] Profile Home screen FlashList scroll with 1000+ songs — must be smooth
- [ ] Profile Search with 5000 songs — query must return < 100ms
- [ ] Profile Expanded Player with artwork — measure frame rate on mid-range Android
- [ ] Check and eliminate unnecessary re-renders with React DevTools
- [ ] Verify no memory leak in audio subscriptions (useEffect cleanup all event listeners)

---

#### Step 25 — Final QA Pass

Test every item in the error handling matrix (Section 14.2).

- [ ] Play song → unplug headphones → pauses
- [ ] Play song → receive call → pauses → call ends → resumes
- [ ] Kill app during playback → relaunch → state restored, not auto-playing
- [ ] Delete a queued song file → app handles gracefully
- [ ] Deny media permission → app shows correct UI, no crash
- [ ] Test on low-end Android device (if available) — no ANR, no crash
- [ ] Test background playback: play song, lock screen, notification controls work
- [ ] Test with 0 songs (fresh device) — EmptyState shown
- [ ] Test playlist creation, add/remove, delete cycle end-to-end

---

## Summary Checklist

| Phase                | Steps | Focus                                                                         |
| -------------------- | ----- | ----------------------------------------------------------------------------- |
| 1 — Foundation       | 1–7   | Setup, tokens, navigation, TrackPlayer, storage, scanner                      |
| 2 — Core Playback    | 8–14  | Events, audio focus, persistence, controls, MiniPlayer, ExpandedPlayer, Queue |
| 3 — Library Features | 15–20 | Search index, Home, Library, Search, Playlists, Favorites                     |
| 4 — Polish           | 21–25 | Animations, BottomSheet, Settings, performance audit, QA                      |

**Total steps: 25**
**Each step is independently testable. Do not skip the Verify step.**

---

## V2 Backlog (After Shipping V1)

| Feature                                           | Why Deferred                                                   |
| ------------------------------------------------- | -------------------------------------------------------------- |
| Shared element player transition                  | Reanimated layout animations + nav sync — high debugging cost  |
| Animated artwork blur on track change             | Expensive on Android — needs device capability check first     |
| Gesture-driven player expansion                   | Gesture conflicts hard to debug before foundation is stable    |
| Marquee scrolling track title                     | Minor polish — not worth the custom component build in V1      |
| Swipe-to-delete queue items with layout animation | Reanimated layout animations — deferred                        |
| Dominant color extraction from artwork            | Breaks 4-color palette contract — architecture decision needed |
| Equalizer screen                                  | Platform DSP APIs — separate engineering track                 |
| Lyrics display                                    | Requires LRC parsing or external API — out of offline scope    |
| RAM-based blur fallback detection                 | Needs DeviceInfo — add after confirming blur is problematic    |
| Cross-device sync                                 | Requires backend — explicitly out of V1                        |

---

_End of PRD v2.0_
