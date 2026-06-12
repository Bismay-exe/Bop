/**
 * LikeButton — heart toggle for ONLINE tracks, backed by the cloud library.
 *
 * Only renders for online songs (videoId present) and when signed in; otherwise
 * it renders an empty spacer so the player layout stays stable (it sits in the
 * slot ExpandedPlayer reserved as `heartPlaceholder`). Local-file favoriting is
 * handled by the existing ghost-heart system in PersistentPlayer.
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants';
import { useAuthStore } from '../../store/authStore';
import { useCloudLibraryStore } from '../../store/cloudLibraryStore';
import { usePlayerStore } from '../../store/playerStore';

const SIZE = 48;

export default function LikeButton() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const signedIn = useAuthStore((s) => Boolean(s.session));
  const likedIds = useCloudLibraryStore((s) => s.likedIds);
  const toggleLike = useCloudLibraryStore((s) => s.toggleLike);

  const isOnline = currentTrack?.source === 'online' && !!currentTrack.videoId;
  if (!isOnline || !signedIn) {
    return <View style={styles.placeholder} />;
  }

  const liked = likedIds.has(currentTrack!.videoId!);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => toggleLike(currentTrack!)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
    >
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        size={26}
        color={liked ? Colors.primary : Colors.textPrimary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: SIZE,
    height: SIZE,
  },
  button: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
