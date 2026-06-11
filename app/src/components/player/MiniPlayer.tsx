import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProgress } from 'react-native-track-player';
import { Colors, Radius, Spacing, Typography } from '../../constants';
import { usePlayer } from '../../hooks/usePlayer';
import { usePlayerLayoutStore } from '../../store/playerLayoutStore';
import { usePlayerStore } from '../../store/playerStore';
import ArtworkView from './ArtworkView';
import ProgressBar from './ProgressBar';
// Custom SVGs
import PauseIcon from '../../assets/icons/pause.svg';
import PlayIcon from '../../assets/icons/play.svg';

interface Props {
  onExpand: () => void;
}

export default function MiniPlayer({ onExpand }: Props) {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.playbackState === 'playing');
  const { play, pause } = usePlayer();
  const togglePlayback = () => {
    if (isPlaying) pause();
    else play();
  };
  const insets = useSafeAreaInsets();
  const setMetrics = usePlayerLayoutStore((s) => s.setMetrics);
  const { position, duration } = useProgress();
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <TouchableOpacity
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}
      activeOpacity={1}
      onPress={onExpand}
    >
      <View
        style={{ opacity: 0 }}
        onLayout={(e) => {
          e.target.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) {
              setMetrics('miniArtwork', { x, y, width, height });
            }
          });
        }}
      >
        <ArtworkView
          uri={currentTrack?.artwork}
          size={56}
          style={styles.artwork}
        />
      </View>

      <View style={styles.contentContainer}>

        {/* Top Row */}
        <View style={styles.topRow}>

          <View style={styles.textContainer}>
            <View
              style={{ opacity: 0 }}
              onLayout={(e) => {
                e.target.measureInWindow((x, y, width, height) => {
                  if (width > 0 && height > 0) {
                    setMetrics('miniTitle', { x, y, width, height });
                  }
                });
              }}
            >
              <Text style={styles.title} numberOfLines={1}>
                {currentTrack?.title || 'Not Playing'}
              </Text>
            </View>

            <View
              style={{ opacity: 0 }}
              onLayout={(e) => {
                e.target.measureInWindow((x, y, width, height) => {
                  if (width > 0 && height > 0) {
                    setMetrics('miniArtist', { x, y, width, height });
                  }
                });
              }}
            >
              <Text style={styles.artist} numberOfLines={1}>
                {currentTrack?.artist || '—'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={togglePlayback}
            style={[
              styles.playButton,
              {
                borderRadius: isPlaying ? 12 : Radius.full,
              },
            ]}
          >
            {isPlaying ? (
              <PauseIcon
                width={20}
                height={20}
                color={Colors.textPrimary}
              />
            ) : (
              <PlayIcon
                width={20}
                height={20}
                color={Colors.textPrimary}
              />
            )}
          </TouchableOpacity>

        </View>

        {/* Progress */}
        <View style={{ marginTop: 8 }}>
          <ProgressBar variant="mini" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  artwork: {
    borderRadius: Radius.md,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 22,
  },
  title: {
    ...Typography.body,
    fontFamily: 'Medium',
    color: '#FFF',
    fontSize: 15,
  },
  artist: {
    ...Typography.label,
    fontFamily: 'Medium',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2, // Moved up to create distance from progress bar
  },
  progressBarTrack: {
    height: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
    marginTop: 12,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 1,
  },
  playButton: {
    width: 38,
    height: 38,
    marginRight: 8,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
