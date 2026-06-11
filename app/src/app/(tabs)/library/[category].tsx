import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlbumCard } from '../../../components/library/AlbumCard';
import { ArtistCard } from '../../../components/library/ArtistCard';
import { PlaylistCard } from '../../../components/library/PlaylistCard';
import { SongCard } from '../../../components/library/SongCard';
import { Colors, Spacing, Typography } from '../../../constants';
import {
  AlbumGroup,
  ArtistGroup,
  useAlbums,
  useArtists,
  useFavorites,
  useFolders,
  useGenres,
  useLanguages,
  useMoods,
  usePlaylists,
  useRecentlyPlayed,
  useSongs,
  useYears,
} from '../../../hooks/useLibrary';
import { replaceQueueAndPlay } from '../../../services/TrackPlayerService';
import { LibraryViewMode, useSettingsStore } from '../../../store/settingsStore';
import { Song } from '../../../types';

type ViewMode = LibraryViewMode;

type AlbumSortKey = 'name' | 'artist' | 'tracks';
type ArtistSortKey = 'name' | 'tracks';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2;

// ─── Sort Sheet ───────────────────────────────────────────────────────────────

interface SortSheetProps<T extends string> {
  visible: boolean;
  options: { key: T; label: string }[];
  current: T;
  onSelect: (key: T) => void;
  onClose: () => void;
}

function SortSheet<T extends string>({ visible, options, current, onSelect, onClose }: SortSheetProps<T>) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;

  const show = useCallback(() => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  }, [slideAnim]);

  const hide = useCallback(
    (cb?: () => void) => {
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start(cb);
    },
    [slideAnim],
  );

  // Animate in/out when visible changes
  if (visible) show();

  const handleClose = () => hide(onClose);
  const handleSelect = (key: T) => {
    onSelect(key);
    hide(onClose);
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg, transform: [{ translateY: slideAnim }] }]}
        >
          <Pressable>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sort By</Text>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.sheetOption}
                onPress={() => handleSelect(opt.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sheetOptionText, current === opt.key && styles.sheetOptionActive]}>
                  {opt.label}
                </Text>
                {current === opt.key && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CategoryDetailScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const songs = useSongs();
  const playlists = usePlaylists();
  const rawArtists = useArtists();
  const rawAlbums = useAlbums();
  const favorites = useFavorites();
  const recentlyPlayed = useRecentlyPlayed();
  const genres = useGenres();
  const years = useYears();
  const folders = useFolders();
  const languages = useLanguages();
  const moods = useMoods();

  // View mode — persisted across navigation via settings store
  const albumsViewMode = useSettingsStore((s) => s.albumsViewMode);
  const artistsViewMode = useSettingsStore((s) => s.artistsViewMode);
  const settingsSet = useSettingsStore((s) => s.set);

  const viewMode: ViewMode =
    category === 'albums' ? albumsViewMode : category === 'artists' ? artistsViewMode : 'list';

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      if (category === 'albums') settingsSet('albumsViewMode', mode);
      else if (category === 'artists') settingsSet('artistsViewMode', mode);
    },
    [category, settingsSet],
  );

  // Sort state
  const [albumSort, setAlbumSort] = useState<AlbumSortKey>('name');
  const [artistSort, setArtistSort] = useState<ArtistSortKey>('name');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  // Sorted albums
  const albums = useMemo<AlbumGroup[]>(() => {
    const copy = [...rawAlbums];
    if (albumSort === 'name') copy.sort((a, b) => a.name.localeCompare(b.name));
    else if (albumSort === 'artist') copy.sort((a, b) => a.artist.localeCompare(b.artist));
    else if (albumSort === 'tracks') copy.sort((a, b) => b.songs.length - a.songs.length);
    return copy;
  }, [rawAlbums, albumSort]);

  // Sorted artists
  const artists = useMemo<ArtistGroup[]>(() => {
    const copy = [...rawArtists];
    if (artistSort === 'name') copy.sort((a, b) => a.name.localeCompare(b.name));
    else if (artistSort === 'tracks') copy.sort((a, b) => b.songs.length - a.songs.length);
    return copy;
  }, [rawArtists, artistSort]);

  const handlePlaySong = useCallback(async (song: Song, queue: Song[]) => {
    const index = queue.findIndex((s) => s.id === song.id);
    await replaceQueueAndPlay(queue, index !== -1 ? index : 0);
  }, []);

  // ── Header stats ────────────────────────────────────────────────────────────
  const statsLine = useMemo(() => {
    switch (category) {
      case 'albums': {
        const trackCount = albums.reduce((acc, a) => acc + a.songs.length, 0);
        return {
          line1Bold: `${trackCount}`,
          line1Normal: ' Tracks in',
          line2Bold: `${albums.length}`,
          line2Normal: ' Albums',
        };
      }
      case 'artists': {
        const trackCount = artists.reduce((acc, a) => acc + a.songs.length, 0);
        return {
          line1Bold: `${trackCount}`,
          line1Normal: ' Tracks from',
          line2Bold: `${artists.length}`,
          line2Normal: ' Artists',
        };
      }
      default:
        return null;
    }
  }, [category, albums, artists]);

  const showToggle = category === 'albums' || category === 'artists';
  const showSort = category === 'albums' || category === 'artists';

  const albumSortOptions: { key: AlbumSortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'artist', label: 'Artist' },
    { key: 'tracks', label: 'Tracks' },
  ];

  const artistSortOptions: { key: ArtistSortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'tracks', label: 'Tracks' },
  ];

  // ── Render list content ─────────────────────────────────────────────────────
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
            renderItem={({ item }) => (
              <PlaylistCard playlist={item} onPress={() => router.push(`/playlist/${item.id}`)} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        );

      case 'artists':
        if (viewMode === 'grid') {
          return (
            <FlashList
              key="artists-grid"
              data={artists}
              numColumns={2}
              renderItem={({ item, index }) => (
                <View style={[styles.gridCell, index % 2 === 0 ? styles.gridCellLeft : styles.gridCellRight]}>
                  <ArtistCard artist={item} onPress={() => {}} viewMode="grid" />
                </View>
              )}
              keyExtractor={(item) => `artist-${item.name}`}
              contentContainerStyle={styles.gridContent}
            />
          );
        }
        return (
          <FlashList
            key="artists-list"
            data={artists}
            renderItem={({ item }) => <ArtistCard artist={item} onPress={() => {}} viewMode="list" />}
            keyExtractor={(item) => `artist-${item.name}`}
            contentContainerStyle={styles.listContent}
          />
        );

      case 'albums':
        if (viewMode === 'grid') {
          return (
            <FlashList
              key="albums-grid"
              data={albums}
              numColumns={2}
              renderItem={({ item, index }) => (
                <View style={[styles.gridCell, index % 2 === 0 ? styles.gridCellLeft : styles.gridCellRight]}>
                  <AlbumCard album={item} onPress={() => {}} viewMode="grid" />
                </View>
              )}
              keyExtractor={(item) => `album-${item.name}`}
              contentContainerStyle={styles.gridContent}
            />
          );
        }
        return (
          <FlashList
            key="albums-list"
            data={albums}
            renderItem={({ item }) => <AlbumCard album={item} onPress={() => {}} viewMode="list" />}
            keyExtractor={(item) => `album-${item.name}`}
            contentContainerStyle={styles.listContent}
          />
        );

      case 'genres':
      case 'years':
      case 'folders':
      case 'language':
      case 'mood': {
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
      }
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

  const title = category
    ? category === 'lastplayed'
      ? 'Last Played'
      : category.charAt(0).toUpperCase() + category.slice(1)
    : '';

  const itemCount =
    category === 'albums'
      ? albums.length
      : category === 'artists'
      ? artists.length
      : category === 'songs'
      ? songs.length
      : category === 'playlists'
      ? playlists.length
      : category === 'favorites'
      ? favorites.length
      : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <View style={styles.backCircle}>
            <Ionicons name="chevron-back" size={24} color={Colors.background} />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>
          {title}
          {itemCount !== null && (
            <Text style={styles.titleCount}> ({itemCount})</Text>
          )}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Stats + Controls bar */}
      {statsLine && (
        <View style={styles.controlsBar}>
          <View style={styles.statsBlock}>
            <Text style={styles.statsLine}>
              <Text style={styles.statsBold}>{statsLine.line1Bold}</Text>
              <Text style={styles.statsNormal}>{statsLine.line1Normal}</Text>
            </Text>
            <Text style={styles.statsLine}>
              <Text style={styles.statsBold}>{statsLine.line2Bold}</Text>
              <Text style={styles.statsNormal}>{statsLine.line2Normal}</Text>
            </Text>
          </View>

          <View style={styles.controlButtons}>
            {showToggle && (
              <>
                <TouchableOpacity
                  style={[styles.iconBtn, viewMode === 'list' && styles.iconBtnActive]}
                  onPress={() => setViewMode('list')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="reorder-three"
                    size={22}
                    color={viewMode === 'list' ? Colors.primary : Colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, viewMode === 'grid' && styles.iconBtnActive]}
                  onPress={() => setViewMode('grid')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="grid"
                    size={18}
                    color={viewMode === 'grid' ? Colors.primary : Colors.textSecondary}
                  />
                </TouchableOpacity>
              </>
            )}
            {showSort && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setSortSheetVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="filter" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.contentContainer}>{renderContent()}</View>

      {/* Sort sheet for albums */}
      {category === 'albums' && (
        <SortSheet
          visible={sortSheetVisible}
          options={albumSortOptions}
          current={albumSort}
          onSelect={setAlbumSort}
          onClose={() => setSortSheetVisible(false)}
        />
      )}

      {/* Sort sheet for artists */}
      {category === 'artists' && (
        <SortSheet
          visible={sortSheetVisible}
          options={artistSortOptions}
          current={artistSort}
          onSelect={setArtistSort}
          onClose={() => setSortSheetVisible(false)}
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

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontSize: 30,
  },
  titleCount: {
    ...Typography.title,
    color: Colors.textSecondary,
    fontSize: 18,
    fontFamily: 'Regular',
  },

  // ── Controls bar ──────────────────────────────────────────────────────────
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.md,
  },
  statsBlock: {
    flexDirection: 'column',
    flex: 1,
  },
  statsLine: {
    fontSize: 18,
    lineHeight: 22,
  },
  statsBold: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    fontFamily: 'Semibold',
    fontSize: 18,
  },
  statsNormal: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    fontSize: 18,
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconBtnActive: {
    backgroundColor: Colors.surface,
  },

  // ── Content ───────────────────────────────────────────────────────────────
  contentContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xxl * 2,
  },
  gridContent: {
    paddingBottom: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  gridCell: {
    flex: 1,
  },
  gridCellLeft: {
    paddingRight: Spacing.md / 2,
  },
  gridCellRight: {
    paddingLeft: Spacing.md / 2,
  },

  // ── Category rows (genre / year / folder / etc.) ──────────────────────────
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
  },
  categorySubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ── Sort sheet ────────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    fontFamily: 'Semibold',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 12,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sheetOptionText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontSize: 17,
  },
  sheetOptionActive: {
    color: Colors.primary,
    fontFamily: 'Semibold',
  },

  // ── Misc ──────────────────────────────────────────────────────────────────
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
});
