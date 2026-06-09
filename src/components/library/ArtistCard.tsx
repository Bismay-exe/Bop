import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants';
import { ArtistGroup } from '../../hooks/useLibrary';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2;

interface ArtistCardProps {
  artist: ArtistGroup;
  onPress: (artist: ArtistGroup) => void;
  viewMode?: 'grid' | 'list';
}

function FallbackAvatar({ size }: { size: number }) {
  return (
    <View style={[styles.fallbackAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="person" size={size * 0.45} color={Colors.textSecondary} />
    </View>
  );
}

function ArtistCardComponent({ artist, onPress, viewMode = 'list' }: ArtistCardProps) {
  // Get artwork from the first song that has artwork
  const artwork = artist.songs.find((s) => s.artwork)?.artwork;

  if (viewMode === 'list') {
    return (
      <TouchableOpacity style={styles.listContainer} onPress={() => onPress(artist)} activeOpacity={0.7}>
        {artwork ? (
          <Image
            source={{ uri: artwork }}
            style={styles.listAvatar}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <FallbackAvatar size={68} />
        )}
        <View style={styles.listDetails}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {artist.name}
          </Text>
          <Text style={styles.listSubtitle} numberOfLines={1}>
            {artist.songs.length} {artist.songs.length === 1 ? 'track' : 'tracks'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid view
  const avatarSize = GRID_ITEM_WIDTH;
  return (
    <TouchableOpacity style={styles.gridContainer} onPress={() => onPress(artist)} activeOpacity={0.7}>
      {artwork ? (
        <Image
          source={{ uri: artwork }}
          style={[styles.gridAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <FallbackAvatar size={avatarSize} />
      )}
      <View style={styles.gridDetails}>
        <Text style={styles.gridTitle} numberOfLines={2} textBreakStrategy="highQuality">
          {artist.name}
        </Text>
        <Text style={styles.gridSubtitle} numberOfLines={1}>
          {artist.songs.length} {artist.songs.length === 1 ? 'track' : 'tracks'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export const ArtistCard = React.memo(ArtistCardComponent, (prev, next) => {
  return (
    prev.artist.name === next.artist.name &&
    prev.artist.songs.length === next.artist.songs.length &&
    prev.viewMode === next.viewMode
  );
});

const styles = StyleSheet.create({
  // List styles
  listContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  listAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.surface,
  },
  listDetails: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  listTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: 3,
    fontFamily: 'Semibold',
    fontSize: 16,
  },
  listSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 13,
  },

  // Grid styles
  gridContainer: {
    width: GRID_ITEM_WIDTH,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  gridAvatar: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  gridDetails: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  gridTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: 2,
    fontFamily: 'Semibold',
    textAlign: 'center',
    fontSize: 14,
  },
  gridSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
  },

  // Shared fallback
  fallbackAvatar: {
    backgroundColor: Colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
});
