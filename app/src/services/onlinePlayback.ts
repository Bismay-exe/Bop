/**
 * Online streaming playback with CONTROLLED, LAZY prefetch.
 *
 * This module implements the queue-strategy corrections explicitly:
 *
 *   P3  No Promise.all over the queue. Stream URLs are resolved ONE AT A TIME
 *       (sequential — concurrency of 1), never the whole radio queue at once.
 *   "Lazy queue"  We do NOT pre-resolve huge queues. We keep RNTP populated with
 *       only the current track + the next PREFETCH_AHEAD (default 2). The rest of
 *       the queue lives as metadata-only `onlineQueue` and is resolved just-in-time
 *       as playback advances.
 *   P4  yt-dlp is slow (5–12s) → resolution runs in the background while the
 *       current track plays; PlaybackActiveTrackChanged advances the window.
 *
 * RNTP requires a URL at add() time, so "lazy" here means: append a track to the
 * RNTP queue only once its stream URL has been resolved.
 */
import TrackPlayer, { Event, Track } from 'react-native-track-player';
import { Song } from '../types';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { setupTrackPlayer } from './TrackPlayerService';
import { getStreamInfo, getRadio } from './api/endpoints';

// How many tracks ahead of the active one we keep resolved + added to RNTP.
// Correction P3: small window, never the whole queue.
const PREFETCH_AHEAD = 2;

interface OnlineSession {
  // Full ordered queue as metadata (URLs NOT resolved yet).
  queue: Song[];
  // How many leading items have been resolved + added to RNTP (they occupy
  // RNTP indices 0..resolvedCount-1 in the same order).
  resolvedCount: number;
}

let session: OnlineSession | null = null;
let resolving = false; // concurrency lock → at most ONE extraction in flight
let listenerAttached = false;

function mapOnlineSongToTrack(song: Song, streamUrl: string): Track {
  return {
    id: song.videoId ?? song.id,
    url: streamUrl,
    title: song.title ?? 'Unknown',
    artist: song.artist ?? 'Unknown',
    album: song.album,
    artwork: song.thumbnailUrl ?? song.artwork ?? undefined,
    duration: song.duration || undefined,
  };
}

/**
 * Resolve + append leading tracks until the active track has PREFETCH_AHEAD
 * resolved tracks after it. Sequential by design (controlled concurrency).
 */
async function ensureWindowResolved(activeIndex: number): Promise<void> {
  if (!session || resolving) return;
  resolving = true;
  try {
    const target = Math.min(activeIndex + PREFETCH_AHEAD, session.queue.length - 1);
    while (session && session.resolvedCount <= target) {
      const next = session.queue[session.resolvedCount];
      if (!next?.videoId) {
        // Unplayable entry — skip it so the window can advance.
        session.resolvedCount += 1;
        continue;
      }
      try {
        const info = await getStreamInfo(next.videoId); // ONE at a time (P3)
        await TrackPlayer.add(mapOnlineSongToTrack(next, info.streamUrl));
        session.resolvedCount += 1;
      } catch (e) {
        // Skip tracks that fail extraction; don't stall the queue (P4 reality).
        console.warn('[onlinePlayback] prefetch failed, skipping', next.videoId, e);
        session.resolvedCount += 1;
      }
    }
  } finally {
    resolving = false;
  }
}

/** One persistent listener that advances the prefetch window as playback moves. */
function attachPrefetchListener(): void {
  if (listenerAttached) return;
  listenerAttached = true;
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async () => {
    if (!session) return; // only act during an online session
    const idx = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
    void ensureWindowResolved(idx);
  });
}

/**
 * Play a single online song immediately, then seed a radio queue in the
 * background. Only the current track blocks; everything else is lazy.
 */
export async function playOnlineWithRadio(song: Song): Promise<void> {
  if (!song.videoId) {
    console.warn('[onlinePlayback] song has no videoId', song.id);
    return;
  }
  await setupTrackPlayer();
  attachPrefetchListener();

  // 1. Resolve ONLY the current track and start playback ASAP.
  const info = await getStreamInfo(song.videoId);
  await TrackPlayer.reset();
  session = { queue: [song], resolvedCount: 0 };
  await TrackPlayer.add(mapOnlineSongToTrack(song, info.streamUrl));
  session.resolvedCount = 1;

  usePlayerStore.getState().setQueue([song]);
  await TrackPlayer.setVolume(1.0);
  await TrackPlayer.play();

  const rate = useSettingsStore.getState().playbackSpeed;
  if (rate !== 1.0) await TrackPlayer.setRate(rate);

  // 2. Background: fetch radio (metadata only) and lazily prefetch next 1–2.
  void seedRadioQueue(song);
}

async function seedRadioQueue(seed: Song): Promise<void> {
  if (!seed.videoId) return;
  try {
    const radio = await getRadio(seed.videoId);
    if (!session) return;
    // Drop the seed itself if the radio echoes it back at the head.
    const rest = radio.filter((t) => t.videoId && t.videoId !== seed.videoId);
    session.queue = [seed, ...rest];
    usePlayerStore.getState().setQueue(session.queue); // UI sees full up-next
    await ensureWindowResolved(0); // resolve next 1–2 only (P3)
  } catch (e) {
    console.warn('[onlinePlayback] radio seed failed', e);
  }
}

/**
 * Play an explicit list of online songs (e.g. search results) starting at
 * `startIndex`, with the same lazy next-1–2 prefetch. No radio seeding.
 */
export async function playOnlineQueue(songs: Song[], startIndex = 0): Promise<void> {
  const playable = songs.filter((s) => s.source === 'online' && s.videoId);
  if (playable.length === 0) return;
  const start = Math.max(0, Math.min(startIndex, playable.length - 1));
  const seed = playable[start];

  await setupTrackPlayer();
  attachPrefetchListener();

  const info = await getStreamInfo(seed.videoId!);
  await TrackPlayer.reset();
  // Order the queue so the chosen track is first; the rest follow in order.
  const ordered = [seed, ...playable.slice(start + 1), ...playable.slice(0, start)];
  session = { queue: ordered, resolvedCount: 0 };
  await TrackPlayer.add(mapOnlineSongToTrack(seed, info.streamUrl));
  session.resolvedCount = 1;

  usePlayerStore.getState().setQueue(ordered);
  await TrackPlayer.setVolume(1.0);
  await TrackPlayer.play();

  const rate = useSettingsStore.getState().playbackSpeed;
  if (rate !== 1.0) await TrackPlayer.setRate(rate);

  void ensureWindowResolved(0);
}

/** Clear the online session (call when switching back to local playback). */
export function endOnlineSession(): void {
  session = null;
}

export function isOnlineSessionActive(): boolean {
  return session !== null;
}
