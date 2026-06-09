import { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';
import { useAlbums } from '../../hooks/useLibrary';
import { AlbumCard } from '../library/AlbumCard';

export function AlbumsSection() {
  const albums = useAlbums();

  const randomAlbums = useMemo(() => {
    if (albums.length === 0) return [];
    // Shuffle the albums array
    const shuffled = [...albums].sort(() => 0.5 - Math.random());
    // Take the first 10
    return shuffled.slice(0, 10);
  }, [albums]);

  if (randomAlbums.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Random Albums</Text>
      <View style={styles.listContainer}>
        <FlashList
          data={randomAlbums}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <AlbumCard album={item} onPress={() => { }} />
            </View>
          )}
          keyExtractor={(item) => `rand-album-${item.name}`}
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
    height: 230, // Approximate height for an AlbumCard
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  cardWrapper: {
    width: 170, // Fixed width for horizontal scrolling
    marginRight: Spacing.md,
  },
});
