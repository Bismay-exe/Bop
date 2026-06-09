import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../../constants';
import { useOnRepeat } from '../../hooks/useLibrary';
import { replaceQueueAndPlay } from '../../services/TrackPlayerService';
import { Song } from '../../types';

export function OnRepeatSection() {
  const songs = useOnRepeat();

  if (songs.length === 0) return null;

  // Take top 20 most repeated
  const onRepeatSongs = songs.slice(0, 20);

  const handlePlay = async (song: Song, index: number) => {
    // Play the clicked song and use the rest of the repeated songs as queue
    await replaceQueueAndPlay(onRepeatSongs, index);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>On Repeat</Text>
      <View style={styles.listContainer}>
        <FlashList
          data={onRepeatSongs}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              style={styles.cardWrapper} 
              activeOpacity={0.7}
              onPress={() => handlePlay(item, index)}
            >
              {item.artwork ? (
                <ExpoImage
                  source={{ uri: item.artwork }}
                  style={styles.artwork}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.artwork, styles.artworkFallback]}>
                  <Ionicons name="musical-note" size={40} color={Colors.textSecondary} />
                </View>
              )}
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {item.artist}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => `on-repeat-${item.id}`}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  listContainer: {
    height: 160, // Match AlbumCard updated height roughly
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  cardWrapper: {
    width: 100, // Match updated UI
    marginRight: Spacing.md,
  },
  artwork: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  artworkFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    fontFamily: 'Medium',
    marginBottom: 2,
  },
  artist: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontFamily: 'Regular',
  },
});
