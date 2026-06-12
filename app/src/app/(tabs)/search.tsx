import { FlashList } from '@shopify/flash-list';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SongCard } from '../../components/library/SongCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { SearchBar } from '../../components/shared/SearchBar';
import { Colors, Spacing, Typography } from '../../constants';
import { useOnlineSearch } from '../../hooks/useOnlineSearch';
import { playOnlineQueue } from '../../services/onlinePlayback';
import { Song } from '../../types';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const { results, loading, error } = useOnlineSearch(query);

  const handlePlaySong = useCallback(
    async (song: Song) => {
      const index = results.findIndex((s) => s.id === song.id);
      // Lazy queue: resolves the tapped track now, prefetches next 1–2 only.
      await playOnlineQueue(results, index !== -1 ? index : 0);
    },
    [results],
  );

  const trimmed = query.trim();

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
        {trimmed.length < 2 ? (
          <EmptyState
            permissionStatus="granted"
            iconOverride="search-outline"
            titleOverride="Find Your Music"
            subtitleOverride="Search millions of songs from YouTube Music."
          />
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : error ? (
          <EmptyState
            permissionStatus="granted"
            iconOverride="cloud-offline-outline"
            titleOverride="Search Failed"
            subtitleOverride={error}
          />
        ) : results.length === 0 ? (
          <EmptyState
            permissionStatus="granted"
            iconOverride="sad-outline"
            titleOverride="No Results"
            subtitleOverride={`We couldn't find anything for "${query}".`}
          />
        ) : (
          <FlashList
            data={results}
            renderItem={({ item }) => (
              <SongCard song={item} onPress={handlePlaySong} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
});
