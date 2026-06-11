import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../constants';
import { usePlayerStore } from '../store/playerStore';
import ArtworkView from '@/components/player/ArtworkView';
import ProgressBar from '@/components/player/ProgressBar';
import PlaybackControls from '@/components/player/PlaybackControls';
import PlayerPillsBar from '@/components/player/PlayerPillsBar';

// Custom SVGs
import DownIcon from '../assets/icons/down.svg';
import DetailsIcon from '../assets/icons/details.svg';
import HeartIcon from '../assets/icons/heart.svg';

const { width, height } = Dimensions.get('window');

const isVeryCompact = height < 700;
const isCompact = height < 820;

const ARTWORK_SIZE = isVeryCompact
  ? width * 0.50
  : isCompact
    ? width * 0.65
    : width * 0.82;

export default function PlayerScreen() {
  const router = useRouter();
  const currentTrack = usePlayerStore(state => state.currentTrack);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <DownIcon width={28} height={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity style={styles.iconButton}>
          <DetailsIcon width={28} height={28} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.centerSection}>
        <ArtworkView
          uri={currentTrack?.artwork}
          size={ARTWORK_SIZE}
          style={styles.artwork} />
      </View>



      {/* Action Pills, Playback Controls & Progress */}
      <View style={styles.bottomSection}>
        {/* Title, Artist, and Like Button */}
        <View style={styles.metadataContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack?.title || 'Not Playing'}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentTrack?.artist || '—'}
            </Text>
          </View>
          <TouchableOpacity style={styles.heartButton}>
            <HeartIcon width={24} height={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <PlayerPillsBar />
        <ProgressBar />
        <PlaybackControls />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    paddingTop: Platform.OS === 'ios' ? Spacing.xxl : Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: isVeryCompact
      ? Spacing.sm
      : Spacing.xl,
  },
  headerTitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  iconButton: {
    padding: Spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 320,
  },
  artwork: {
    borderRadius: Radius.xl * 2, // Larger radius for player artwork
    // Heavy shadow mimicking the PNG
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 25,
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  title: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  artist: {
    ...Typography.body,
    fontFamily: 'Regular',
    color: Colors.textSecondary,
  },
  heartButton: {
    padding: Spacing.xs,
  },
  bottomSection: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    bottom: Spacing.xxl,
    gap: isVeryCompact
      ? Spacing.sm
      : Spacing.xl,
  },
});
