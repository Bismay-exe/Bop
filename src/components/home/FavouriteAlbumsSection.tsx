import { FlashList } from '@shopify/flash-list';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';
import { useAlbums } from '../../hooks/useLibrary';
import { AlbumCard } from '../library/AlbumCard';

export function FavouriteAlbumsSection() {
  const albums = useAlbums();

  if (albums.length === 0) return null;

  // Let's take the first 10 albums. Eventually this should be derived from favorite songs
  const favoriteAlbums = albums.slice(0, 10);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Favourite Albums</Text>
      <View style={styles.listContainer}>
        <FlashList
          data={favoriteAlbums}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <AlbumCard album={item} onPress={() => { }} />
            </View>
          )}
          keyExtractor={(item) => `fav-album-${item.name}`}
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
    height: 200, // Approximate height for an AlbumCard
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  cardWrapper: {
    width: 150, // Fixed width for horizontal scrolling
    marginRight: Spacing.md,
  },
});
