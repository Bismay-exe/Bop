import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { AlbumGroup } from '../../hooks/useLibrary';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { Ionicons } from '@expo/vector-icons';

interface AlbumCardProps {
  album: AlbumGroup;
  onPress: (album: AlbumGroup) => void;
}

// Fallback icon view if we don't have artwork
function FallbackArtwork() {
  return (
    <View style={[styles.artwork, styles.fallbackContainer]}>
      <Ionicons name="albums-outline" size={32} color={Colors.textSecondary} />
    </View>
  );
}

function AlbumCardComponent({ album, onPress }: AlbumCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(album)}
    >
      {album.artwork ? (
        <Image
          source={{ uri: album.artwork }}
          style={styles.artwork}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <FallbackArtwork />
      )}
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {album.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {album.artist} • {album.songs.length} {album.songs.length === 1 ? 'song' : 'songs'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export const AlbumCard = React.memo(AlbumCardComponent, (prev, next) => {
  return prev.album.name === next.album.name && 
         prev.album.songs.length === next.album.songs.length &&
         prev.album.artwork === next.album.artwork;
});

const styles = StyleSheet.create({
  container: {
    width: 140,
    marginRight: Spacing.md,
    marginBottom: Spacing.md,
  },
  artwork: {
    width: 150,
    height: 150,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    paddingHorizontal: 2,
  },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
