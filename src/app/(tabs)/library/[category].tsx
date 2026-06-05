import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryStore } from '../../../store/libraryStore';
import { 
  useAlbums, useArtists, useFavorites, usePlaylists, 
  useGenres, useYears, useFolders, useLanguages, useMoods, useRecentlyPlayed
} from '../../../hooks/useLibrary';
import { SongCard } from '../../../components/library/SongCard';
import { AlbumCard } from '../../../components/library/AlbumCard';
import { ArtistCard } from '../../../components/library/ArtistCard';
import { PlaylistCard } from '../../../components/library/PlaylistCard';
import { replaceQueueAndPlay } from '../../../services/TrackPlayerService';
import { Song } from '../../../types';

export default function CategoryDetailScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const songs = useLibraryStore((s) => s.songs);
  
  const playlists = usePlaylists();
  const artists = useArtists();
  const albums = useAlbums();
  const favorites = useFavorites();
  const recentlyPlayed = useRecentlyPlayed();
  const genres = useGenres();
  const years = useYears();
  const folders = useFolders();
  const languages = useLanguages();
  const moods = useMoods();

  const handlePlaySong = useCallback(async (song: Song, queue: Song[]) => {
    const index = queue.findIndex(s => s.id === song.id);
    await replaceQueueAndPlay(queue, index !== -1 ? index : 0);
  }, []);

  const renderContent = () => {
    switch (category) {
      case 'songs':
        return (
          <FlashList
            data={songs}
            renderItem={({ item }) => <SongCard song={item} onPress={(s) => handlePlaySong(s, songs)} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        );
      case 'favorites':
        return (
          <FlashList
            data={favorites}
            renderItem={({ item }) => <SongCard song={item} onPress={(s) => handlePlaySong(s, favorites)} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        );
      case 'lastplayed':
        return (
          <FlashList
            data={recentlyPlayed}
            renderItem={({ item }) => <SongCard song={item} onPress={(s) => handlePlaySong(s, recentlyPlayed)} />}
            keyExtractor={(item) => item.id + '_recent'}
            contentContainerStyle={styles.listContent}
          />
        );
      case 'playlists':
        return (
          <FlashList
            data={playlists}
            renderItem={({ item }) => <PlaylistCard playlist={item} onPress={() => router.push(`/playlist/${item.id}`)} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        );
      case 'artists':
        return (
          <FlashList
            data={artists}
            renderItem={({ item }) => <ArtistCard artist={item} onPress={() => {}} />}
            keyExtractor={(item) => `artist-${item.name}`}
            contentContainerStyle={styles.listContent}
          />
        );
      case 'albums':
        return (
          <FlashList
            data={albums}
            numColumns={2}
            renderItem={({ item }) => (
              <View style={styles.gridItem}>
                <AlbumCard album={item} onPress={() => {}} />
              </View>
            )}
            keyExtractor={(item) => `album-${item.name}`}
            contentContainerStyle={styles.listContent}
          />
        );
      case 'genres':
      case 'years':
      case 'folders':
      case 'language':
      case 'mood':
        // Generic renderer for CategoryGroup
        let data: any[] = [];
        if (category === 'genres') data = genres;
        if (category === 'years') data = years;
        if (category === 'folders') data = folders;
        if (category === 'language') data = languages;
        if (category === 'mood') data = moods;

        return (
          <FlashList
            data={data}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  <Text style={styles.categorySubtitle}>{item.songs.length} songs</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.name}
            contentContainerStyle={styles.listContent}
          />
        );
      case 'filesystem':
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="construct-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.errorText}>Filesystem browser coming soon.</Text>
          </View>
        );
      default:
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Category not found</Text>
          </View>
        );
    }
  };

  // Capitalize first letter for title
  const title = category ? category.charAt(0).toUpperCase() + category.slice(1) : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.backButton} />
      </View>
      
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xxl * 2, // Miniplayer padding
  },
  gridItem: {
    flex: 1,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  categorySubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
