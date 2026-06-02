import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { useLibraryStore } from '../../store/libraryStore';
import { SongCard } from '../../components/library/SongCard';
import { EmptyState } from '../../components/shared/EmptyState';
import { replaceQueueAndPlay } from '../../services/TrackPlayerService';
import { PlaylistService } from '../../services/PlaylistService';
import { Song } from '../../types';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const playlists = useLibraryStore((s) => s.playlists);
  const allSongs = useLibraryStore((s) => s.songs);

  const playlist = useMemo(() => playlists.find(p => p.id === id), [playlists, id]);

  // Handle deletion / invalid ID
  useEffect(() => {
    if (!playlist) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/library');
      }
    }
  }, [playlist, router]);

  // Derived state: remove any deleted songs before render
  const validSongs = useMemo(() => {
    if (!playlist) return [];
    const songMap = new Map(allSongs.map(s => [s.id, s]));
    return playlist.songIds
      .map(songId => songMap.get(songId))
      .filter((s): s is Song => s !== undefined);
  }, [playlist, allSongs]);

  const handlePlaySong = useCallback(async (song: Song) => {
    const index = validSongs.findIndex((s) => s.id === song.id);
    await replaceQueueAndPlay(validSongs, index !== -1 ? index : 0);
  }, [validSongs]);

  const handleRemoveSong = useCallback((song: Song) => {
    if (playlist) {
      PlaylistService.removeSongFromPlaylist(playlist.id, song.id);
    }
  }, [playlist]);

  if (!playlist) return null; // Will navigate back via effect

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title} numberOfLines={1}>{playlist.name}</Text>
          <Text style={styles.subtitle}>{validSongs.length} songs</Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={() => PlaylistService.deletePlaylist(playlist.id)}
        >
          <Ionicons name="trash-outline" size={24} color={Colors.error || 'red'} />
        </TouchableOpacity>
      </View>

      {validSongs.length === 0 ? (
        <EmptyState
          permissionStatus="granted"
          iconOverride="list-outline"
          titleOverride="Empty Playlist"
          subtitleOverride="Add songs to this playlist from the library."
        />
      ) : (
        <FlashList
          data={validSongs}
          renderItem={({ item }) => (
            <View style={styles.songRow}>
              <View style={styles.songCardWrapper}>
                <SongCard song={item} onPress={handlePlaySong} />
              </View>
              <TouchableOpacity 
                style={styles.removeButton} 
                onPress={() => handleRemoveSong(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="remove-circle-outline" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + Spacing.md, // Account for status bar spacing
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    marginRight: Spacing.sm,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songCardWrapper: {
    flex: 1,
  },
  removeButton: {
    paddingRight: Spacing.md,
  },
});

