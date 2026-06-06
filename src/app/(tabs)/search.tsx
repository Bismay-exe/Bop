import { FlashList } from '@shopify/flash-list';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SongCard } from '../../components/library/SongCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { SearchBar } from '../../components/shared/SearchBar';
import { Colors, Spacing, Typography } from '../../constants';
import { useSearch } from '../../hooks/useSearch';
import { replaceQueueAndPlay } from '../../services/TrackPlayerService';
import { useLibraryStore } from '../../store/libraryStore';
import { Song } from '../../types';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const searchResults = useSearch(query);
  const isScanning = useLibraryStore((s) => s.isScanning);

  const handlePlaySong = useCallback(async (song: Song) => {
    // For search, queue context is just the search results
    const index = searchResults.findIndex((s) => s.id === song.id);
    await replaceQueueAndPlay(searchResults, index !== -1 ? index : 0);
  }, [searchResults]);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Search</Text>

      <View style={styles.searchContainer}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Songs, Artists, Albums"
        />
      </View>

      <View style={styles.contentContainer}>
        {isScanning ? (
          <EmptyState permissionStatus="granted" />
        ) : query.trim().length < 2 ? (
          <EmptyState
            permissionStatus="granted"
            iconOverride="search-outline"
            titleOverride="Find Your Music"
            subtitleOverride="Search for songs, artists, or albums in your library."
          />
        ) : searchResults.length === 0 ? (
          <EmptyState
            permissionStatus="granted"
            iconOverride="sad-outline"
            titleOverride="No Results"
            subtitleOverride={`We couldn't find anything for "${query}".`}
          />
        ) : (
          <FlashList
            data={searchResults}
            renderItem={({ item }) => (
              <SongCard song={item} onPress={handlePlaySong} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },
  searchContainer: {
    marginBottom: Spacing.sm,
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
});

