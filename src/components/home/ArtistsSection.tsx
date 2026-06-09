import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Colors, Typography, Spacing } from '../../constants';
import { useArtists } from '../../hooks/useLibrary';
import { ArtistCircle } from './ArtistCircle';

export function ArtistsSection() {
  const artists = useArtists();
  
  const randomArtists = useMemo(() => {
    if (artists.length === 0) return [];
    const shuffled = [...artists].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 10);
  }, [artists]);

  if (randomArtists.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Random Artists</Text>
      <View style={styles.listContainer}>
        <FlashList
          data={randomArtists}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            // Find the first song by this artist that has artwork to use as the avatar
            const songWithArt = item.songs.find(s => !!s.artwork);
            return (
              <View style={styles.cardWrapper}>
                <ArtistCircle 
                  name={item.name} 
                  artworkUri={songWithArt?.artwork} 
                  onPress={() => {}} 
                />
              </View>
            );
          }}
          keyExtractor={(item) => `rand-artist-${item.name}`}
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
    height: 200, // Approximate height for ArtistCircle
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  cardWrapper: {
    marginRight: Spacing.md,
  },
});
