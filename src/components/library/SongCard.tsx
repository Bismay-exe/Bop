import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../../types';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { queueMetadataExtraction } from '../../services/media/metadata';
import { MediaCache } from '../../services/media/cache';
import { getArtworkFilePath } from '../../services/media/artwork';
import { useLibraryStore } from '../../store/libraryStore';

interface SongCardProps {
  song: Song;
  onPress: (song: Song) => void;
  onLongPress?: (song: Song) => void;
  isActive?: boolean;
}

function FallbackArtwork() {
  return (
    <View style={[styles.artwork, { alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name="musical-note" size={24} color={Colors.textSecondary} />
    </View>
  );
}

function SongCardComponent({ song, onPress, onLongPress, isActive }: SongCardProps) {
  const [localSong, setLocalSong] = React.useState(song);

  React.useEffect(() => {
    setLocalSong(song);
  }, [song]);

  React.useEffect(() => {
    // If we haven't extracted metadata yet, enqueue it just-in-time
    if (!localSong.title) {
      const cancel = queueMetadataExtraction(localSong as any, 10, (metadata) => {
        const updated = {
          ...localSong,
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          artwork: metadata.hasArtwork ? getArtworkFilePath(localSong.id, localSong.modificationTime || 0) : undefined,
        };
        setLocalSong(updated);
        // Persist so we don't extract again next time
        MediaCache.updateSong(localSong.id, updated);
        // Also update the library store so artwork is available when songs 
        // are passed to TrackPlayer (mini player, expanded player, etc.)
        useLibraryStore.getState().updateSongInPlace(localSong.id, updated);
      });
      return cancel;
    }
  }, [localSong.id, localSong.title]);

  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.activeContainer]}
      onPress={() => onPress(localSong)}
      onLongPress={onLongPress ? () => onLongPress(localSong) : undefined}
      delayLongPress={250}
    >
      {localSong.artwork ? (
        <Image
          source={{ uri: localSong.artwork }}
          style={styles.artwork}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <FallbackArtwork />
      )}
      <View style={styles.details}>
        <Text
          style={[styles.title, isActive && styles.activeText]}
          numberOfLines={1}
        >
          {localSong.title || localSong.filename.replace(/\.[^/.]+$/, '')}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {localSong.artist || 'Loading...'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.moreButton}
        onPress={onLongPress ? () => onLongPress(localSong) : undefined}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export const SongCard = React.memo(SongCardComponent, (prev, next) => {
  return prev.song.id === next.song.id && prev.isActive === next.isActive;
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
  },
  activeContainer: {
    backgroundColor: Colors.surface,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  details: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  activeText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  artist: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  moreButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});
