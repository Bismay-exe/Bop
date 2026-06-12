import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SongCard } from '../../../components/library/SongCard';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Colors, Radius, Spacing, Typography } from '../../../constants';
import { playOnlineQueue } from '../../../services/onlinePlayback';
import { useAuthStore } from '../../../store/authStore';
import { useCloudLibraryStore } from '../../../store/cloudLibraryStore';
import { Song } from '../../../types';

export default function CloudLibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const signedIn = useAuthStore((s) => Boolean(s.session));
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const { likedSongs, playlists, loading, refresh } = useCloudLibraryStore();

  useEffect(() => {
    if (signedIn) refresh();
  }, [signedIn, refresh]);

  const handlePlay = useCallback(
    async (song: Song) => {
      const index = likedSongs.findIndex((s) => s.id === song.id);
      await playOnlineQueue(likedSongs, index !== -1 ? index : 0);
    },
    [likedSongs],
  );

  if (!signedIn) {
    return (
      <View style={styles.container}>
        <Text style={[styles.headerTitle, { paddingTop: Math.max(insets.top, Spacing.xl) }]}>
          Cloud Library
        </Text>
        <View style={styles.centered}>
          <EmptyState
            permissionStatus="granted"
            iconOverride="cloud-outline"
            titleOverride="Sign in to sync"
            subtitleOverride="Your liked songs and playlists live here once you sign in."
          />
          <TouchableOpacity style={styles.signInBtn} onPress={signInWithGoogle} activeOpacity={0.8}>
            <Ionicons name="logo-google" size={18} color={Colors.textPrimary} />
            <Text style={styles.signInText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.headerTitle, { paddingTop: Math.max(insets.top, Spacing.xl) }]}>
        Cloud Library
      </Text>
      <FlashList
        data={likedSongs}
        renderItem={({ item }) => <SongCard song={item} onPress={handlePlay} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <View>
            {playlists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Playlists</Text>
                {playlists.map((pl) => (
                  <TouchableOpacity
                    key={pl.id}
                    style={styles.playlistRow}
                    onPress={() => router.push(`/playlist/${pl.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.playlistIcon}>
                      <Ionicons name="musical-notes" size={22} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playlistName} numberOfLines={1}>{pl.name}</Text>
                      <Text style={styles.playlistMeta}>{pl.song_count} songs</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.sectionTitle}>Liked Songs</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : (
            <EmptyState
              permissionStatus="granted"
              iconOverride="heart-outline"
              titleOverride="No liked songs yet"
              subtitleOverride="Tap the heart on any song to save it here."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerTitle: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.xxl },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  section: { marginBottom: Spacing.md },
  sectionTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistName: { ...Typography.body, color: Colors.textPrimary },
  playlistMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
  },
  signInText: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600' },
});
