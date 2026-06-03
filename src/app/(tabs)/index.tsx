import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../constants';
import { useLibraryStore } from '../../store/libraryStore';
import { useFavorites } from '../../hooks/useLibrary';
import { SongCard } from '../../components/library/SongCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { Song } from '../../types';
import { replaceQueueAndPlay } from '../../services/TrackPlayerService';
import { scanLocalMusic } from '../../services/MediaScannerService';
import * as MediaLibrary from 'expo-media-library/legacy';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const songs = useLibraryStore((s) => s.songs);
  const recentlyPlayedIds = useLibraryStore((s) => s.recentlyPlayed);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const isRefreshing = useLibraryStore((s) => s.isRefreshing);
  const { setSongs, setRefreshing, finalizeScan } = useLibraryStore();
  
  const favorites = useFavorites();

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const scannedSongs = await scanLocalMusic(() => {});
      setSongs(scannedSongs);
      finalizeScan();
    } catch (err) {
      console.error(err);
      setRefreshing(false);
    }
  }, [setRefreshing, setSongs, finalizeScan]);

  const handlePlaySong = useCallback(async (song: Song, queue: Song[]) => {
    const index = queue.findIndex(s => s.id === song.id);
    await replaceQueueAndPlay(queue, index !== -1 ? index : 0);
  }, []);

  // Automatic background scan on mount if permissions were already granted
  React.useEffect(() => {
    let mounted = true;
    const runBackgroundScan = async () => {
      try {
        const { status } = await MediaLibrary.getPermissionsAsync();
        if (status === 'granted' && mounted) {
          useLibraryStore.getState().setScanning(true);
          const scannedSongs = await scanLocalMusic(() => {});
          if (mounted) {
            setSongs(scannedSongs);
            finalizeScan();
          }
        }
      } catch (err) {
        console.error('Background scan failed:', err);
        if (mounted) {
          useLibraryStore.getState().setScanning(false);
        }
      }
    };
    
    // Only run if we actually have some hydrated songs, or if we want to silently refresh
    runBackgroundScan();
    
    return () => { mounted = false; };
  }, [setSongs, finalizeScan]);

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const renderHorizontalList = (data: Song[], title: string) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.horizontalSection}>
        {renderSectionHeader(title)}
        <View style={styles.horizontalListContainer}>
          <FlashList
            data={data}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.horizontalCardWrapper}>
                <SongCard song={item} onPress={(s) => handlePlaySong(s, data)} />
              </View>
            )}
            keyExtractor={(item) => `horizontal-${item.id}`}
            contentContainerStyle={{ paddingHorizontal: Spacing.md }}
          />
        </View>
      </View>
    );
  };

  if (isScanning && !isRefreshing) {
    return <EmptyState permissionStatus="granted" />;
  }

  if (songs.length === 0 && !isRefreshing) {
    return <EmptyState permissionStatus="granted" />;
  }

  const recentlyPlayed = recentlyPlayedIds
    .map(id => songs.find(s => s.id === id))
    .filter((s): s is Song => s !== undefined)
    .slice(0, 10);

  const topFavorites = favorites.slice(0, 10);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Spacing.md) }]}>
        <Text style={styles.headerTitle}>Home</Text>
      </View>

      <FlashList
        data={songs}
        ListHeaderComponent={
          <View>
            {renderHorizontalList(recentlyPlayed, 'Recently Played')}
            {renderHorizontalList(topFavorites, 'Favorites')}
            {renderSectionHeader('All Songs')}
          </View>
        }
        renderItem={({ item }) => (
          <SongCard song={item} onPress={(s) => handlePlaySong(s, songs)} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, Spacing.xxl) }}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh} 
            tintColor={Colors.primary} 
            colors={[Colors.primary]} 
          />
        }
      />
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
  headerTitle: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
  },
  settingsButton: {
    padding: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '700',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  horizontalSection: {
    marginBottom: Spacing.md,
  },
  horizontalListContainer: {
    height: 72, // SongCard approx height
  },
  horizontalCardWrapper: {
    width: 280, // Constrain width for horizontal scroll
  },
});

