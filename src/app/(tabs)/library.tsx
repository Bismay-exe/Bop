import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { useLibraryStore } from '../../store/libraryStore';
import { useAlbums, useArtists, useFavorites, usePlaylists } from '../../hooks/useLibrary';
import { SongCard } from '../../components/library/SongCard';
import { AlbumCard } from '../../components/library/AlbumCard';
import { ArtistCard } from '../../components/library/ArtistCard';
import { PlaylistCard } from '../../components/library/PlaylistCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { replaceQueueAndPlay } from '../../services/TrackPlayerService';
import { scanLocalMusic } from '../../services/MediaScannerService';
import { Song, Playlist } from '../../types';

type Tab = 'Playlists' | 'Artists' | 'Albums' | 'Songs' | 'Favorites';
const TABS: Tab[] = ['Playlists', 'Artists', 'Albums', 'Songs', 'Favorites'];

export default function LibraryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Songs');
  
  const songs = useLibraryStore((s) => s.songs);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const isRefreshing = useLibraryStore((s) => s.isRefreshing);
  const { setSongs, setRefreshing, finalizeScan } = useLibraryStore();
  
  const albums = useAlbums();
  const artists = useArtists();
  const favorites = useFavorites();
  const playlists = usePlaylists();

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

  const handlePlaylistPress = useCallback((playlist: Playlist) => {
    router.push(`/playlist/${playlist.id}`);
  }, [router]);

  if (isScanning && !isRefreshing) {
    return <EmptyState permissionStatus="granted" />;
  }
  
  if (songs.length === 0 && !isRefreshing) {
    return <EmptyState permissionStatus="granted" />;
  }

  const commonRefreshControl = (
    <RefreshControl 
      refreshing={isRefreshing} 
      onRefresh={handleRefresh} 
      tintColor={Colors.primary} 
      colors={[Colors.primary]} 
    />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Playlists':
        return (
          <FlashList
            data={playlists}
            renderItem={({ item }) => (
              <PlaylistCard playlist={item} onPress={handlePlaylistPress} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={commonRefreshControl}
          />
        );
      case 'Artists':
        return (
          <FlashList
            data={artists}
            renderItem={({ item }) => (
              <ArtistCard artist={item} onPress={() => {}} />
            )}
            keyExtractor={(item) => `artist-${item.name}`}
            contentContainerStyle={styles.listContent}
            refreshControl={commonRefreshControl}
          />
        );
      case 'Albums':
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
            refreshControl={commonRefreshControl}
          />
        );
      case 'Songs':
        return (
          <FlashList
            data={songs}
            renderItem={({ item }) => (
              <SongCard song={item} onPress={(s) => handlePlaySong(s, songs)} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={commonRefreshControl}
          />
        );
      case 'Favorites':
        return (
          <FlashList
            data={favorites}
            renderItem={({ item }) => (
              <SongCard song={item} onPress={(s) => handlePlaySong(s, favorites)} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={commonRefreshControl}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Library</Text>
      
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  headerTitle: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tabsContainer: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  activeTab: {
    backgroundColor: Colors.textPrimary,
  },
  tabText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.background,
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  gridItem: {
    flex: 1,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
  },
});

