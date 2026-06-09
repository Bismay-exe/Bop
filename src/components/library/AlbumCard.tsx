import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { AlbumGroup } from '../../hooks/useLibrary';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2;

// How much of the CD peeks out from behind the artwork (in px)
const CD_SIZE = 88;        // diameter of the CD disc
const CD_PEEK = 18;        // how many px of the CD are visible past the right edge of artwork

interface AlbumCardProps {
  album: AlbumGroup;
  onPress: (album: AlbumGroup) => void;
  viewMode?: 'grid' | 'list';
}

function FallbackArtwork({ size, radius }: { size: number; radius: number }) {
  return (
    <View style={[styles.fallbackContainer, { width: size, height: size, borderRadius: radius }]}>
      <Ionicons name="albums-outline" size={size * 0.35} color={Colors.textSecondary} />
    </View>
  );
}

/**
 * A pure-RN CD disc rendered with nested circles.
 * Sits absolutely positioned behind the album artwork.
 */
function CdDisc({ size }: { size: number }) {
  const center = size / 2;
  const holeR = size * 0.09;
  const innerRingR = size * 0.28;

  return (
    <View
      style={[
        styles.cdDisc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
    </View>
  );
}

function AlbumCardComponent({ album, onPress, viewMode = 'grid' }: AlbumCardProps) {
  if (viewMode === 'list') {
    const artworkSize = 92;

    return (
      <TouchableOpacity style={styles.listContainer} onPress={() => onPress(album)} activeOpacity={0.7}>
        {/* CD + artwork layered together */}
        <View style={[styles.listArtworkWrapper, { width: artworkSize + CD_PEEK, height: artworkSize }]}>
          {/* CD disc behind artwork, offset so it peeks to the right */}
          <View
            style={{
              position: 'absolute',
              right: 0,
              top: (artworkSize - CD_SIZE) / 2,
            }}
          >
            <CdDisc size={CD_SIZE} />
          </View>

          {/* Album artwork on top */}
          {album.artwork ? (
            <Image
              source={{ uri: album.artwork }}
              style={[styles.listArtwork, { width: artworkSize, height: artworkSize }]}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <FallbackArtwork size={artworkSize} radius={Radius.md} />
          )}
        </View>

        <View style={styles.listDetails}>
          <Text style={styles.listTitle} numberOfLines={2} textBreakStrategy="highQuality">
            {album.name}
          </Text>
          <Text style={styles.listArtist} numberOfLines={1}>
            {album.artist}
          </Text>
          <Text style={styles.listSubtitle} numberOfLines={1}>
            {album.songs.length} {album.songs.length === 1 ? 'track' : 'tracks'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid view
  return (
    <TouchableOpacity style={styles.gridContainer} onPress={() => onPress(album)} activeOpacity={0.7}>
      {album.artwork ? (
        <Image
          source={{ uri: album.artwork }}
          style={styles.gridArtwork}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <FallbackArtwork size={GRID_ITEM_WIDTH} radius={Radius.md} />
      )}
      <View style={styles.gridDetails}>
        <Text style={styles.gridTitle} numberOfLines={1}>
          {album.name}
        </Text>
        <Text style={styles.gridArtist} numberOfLines={1}>
          {album.artist}
        </Text>
        <Text style={styles.gridSubtitle} numberOfLines={1}>
          {album.songs.length} {album.songs.length === 1 ? 'track' : 'tracks'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export const AlbumCard = React.memo(AlbumCardComponent, (prev, next) => {
  return (
    prev.album.name === next.album.name &&
    prev.album.songs.length === next.album.songs.length &&
    prev.album.artwork === next.album.artwork &&
    prev.viewMode === next.viewMode
  );
});

const styles = StyleSheet.create({
  // ── Grid ──────────────────────────────────────────────────────────────────
  gridContainer: {
    width: GRID_ITEM_WIDTH,
    marginBottom: Spacing.xl,
  },
  gridArtwork: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  gridDetails: {
    paddingHorizontal: 2,
  },
  gridTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  gridArtist: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: 1,
  },
  gridSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
  },
  listArtworkWrapper: {
    // contains the CD + artwork overlay; no overflow hidden so CD can peek
    position: 'relative',
  },
  listArtwork: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  listDetails: {
    flex: 1,
    marginLeft: CD_PEEK,
    justifyContent: 'center',
  },
  listTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  listArtist: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  listSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },

  // ── CD disc ───────────────────────────────────────────────────────────────
  cdDisc: {
    backgroundColor: '#00000030',
    overflow: 'hidden',
    // subtle shadow
    // shadowColor: '#000',
    // shadowOffset: { width: 1, height: 1 },
    // shadowOpacity: 0.15,
    // shadowRadius: 3,
    // elevation: 3,
  },

  // ── Shared fallback ───────────────────────────────────────────────────────
  fallbackContainer: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
