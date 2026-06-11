import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Colors, Radius, Spacing, Typography } from '../../../constants';
import { scanLocalMusic } from '../../../services/MediaScannerService';
import { useLibraryStore } from '../../../store/libraryStore';

const CATEGORIES = [
  { id: 'playlists', title: 'Playlists', icon: 'musical-notes' },
  { id: 'artists', title: 'Artists', icon: 'person' },
  { id: 'albums', title: 'Albums', icon: 'albums' },
  { id: 'songs', title: 'Songs', icon: 'musical-note' },
  { id: 'lastplayed', title: 'Last Played', icon: 'time' },
  { id: 'favorites', title: 'Favorites', icon: 'heart' },
  { id: 'genres', title: 'Genres', icon: 'color-filter' },
  { id: 'years', title: 'Years', icon: 'calendar' },
  { id: 'folders', title: 'Folders', icon: 'folder' },
  { id: 'language', title: 'Language', icon: 'language' },
  { id: 'mood', title: 'Mood', icon: 'happy' },
  { id: 'filesystem', title: 'Filesystem', icon: 'file-tray-full' },
] as const;

export default function LibraryIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const songs = useLibraryStore((s) => s.songs);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const isRefreshing = useLibraryStore((s) => s.isRefreshing);
  const { setSongs, setRefreshing, finalizeScan } = useLibraryStore();

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const scannedSongs = await scanLocalMusic(() => { });
      setSongs(scannedSongs);
      finalizeScan();
    } catch (err) {
      console.error(err);
      setRefreshing(false);
    }
  }, [setRefreshing, setSongs, finalizeScan]);

  if (isScanning && !isRefreshing) {
    return <EmptyState permissionStatus="granted" />;
  }

  if (songs.length === 0 && !isRefreshing) {
    return <EmptyState permissionStatus="granted" />;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.headerTitle, { paddingTop: Math.max(insets.top, Spacing.xl) }]}>Library</Text>

      <ScrollView
        contentContainerStyle={styles.gridContainer}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.card}
              onPress={() => router.push(`/library/${cat.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={cat.icon as any} size={32} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{cat.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    paddingBottom: Spacing.md,
  },
  gridContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl * 2, // Space for miniplayer
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%', // 2 columns
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1.2, // Slightly rectangular
  },
  iconContainer: {
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});
