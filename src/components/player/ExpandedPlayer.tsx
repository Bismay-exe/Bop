import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { usePlayerStore } from '../../store/playerStore';
import { usePlayerAnimation } from '../../contexts/PlayerAnimationContext';
import { usePlayerLayoutStore } from '../../store/playerLayoutStore';
import ArtworkView from './ArtworkView';
import ProgressBar from './ProgressBar';
import PlaybackControls from './PlaybackControls';
import PlayerPillsBar from './PlayerPillsBar';

// Custom SVGs
import DownIcon from '../../assets/icons/down.svg';
import DetailsIcon from '../../assets/icons/details.svg';
import HeartIcon from '../../assets/icons/heart.svg';

const { width, height } = Dimensions.get('window');
const isVeryCompact = height < 700;
const isCompact = height < 820;

const ARTWORK_SIZE = isVeryCompact
  ? width * 0.50
  : isCompact
    ? width * 0.65
    : width * 0.82;

interface Props {
  onCollapse: () => void;
}

export default function ExpandedPlayer({ onCollapse }: Props) {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const { expandProgress } = usePlayerAnimation();
  const insets = useSafeAreaInsets();
  const setMetrics = usePlayerLayoutStore((s) => s.setMetrics);

  const controlsStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(expandProgress.value, [0.6, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(expandProgress.value, [0.6, 1], [30, 0], Extrapolation.CLAMP) }
      ]
    };
  });

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }]}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCollapse} style={styles.iconButton}>
          <DownIcon width={28} height={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Now Playing</Text>
        <TouchableOpacity style={styles.iconButton}>
          <DetailsIcon width={28} height={28} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.centerSection}>
        <View
          style={{ opacity: 0 }}
          onLayout={(e) => {
            e.target.measureInWindow((x, y, width, height) => {
              if (width > 0 && height > 0) {
                setMetrics('expandedArtwork', { x, y, width, height });
              }
            });
          }}
        >
          <ArtworkView
            uri={currentTrack?.artwork}
            size={ARTWORK_SIZE}
            style={styles.artwork}
          />
        </View>
      </View>

      {/* Bottom Section */}
      <View style={[styles.bottomSection, { bottom: Math.max(insets.bottom, 58) }]}>


        {/* Title, Artist, and Like Button */}
        <View style={styles.metadataContainer}>
          <View style={styles.textContainer}>
            <View
              style={{ opacity: 0 }}
              onLayout={(e) => {
                e.target.measureInWindow((x, y, width, height) => {
                  if (width > 0 && height > 0) {
                    setMetrics('expandedTitle', { x, y, width, height });
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
                    setMetrics('expandedArtist', { x, y, width, height });
                  }
                });
              }}
            >
              <Text style={styles.artist} numberOfLines={1}>
                {currentTrack?.artist || '—'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.heartButton}>
            <HeartIcon width={24} height={24} color={Colors.background} />
          </TouchableOpacity>
        </View>
        {/* Controls that reveal after expansion */}
        <Animated.View style={[styles.controlsContainer, controlsStyle]}>
          <PlayerPillsBar />
          <ProgressBar />
          <PlaybackControls />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: isVeryCompact ? Spacing.sm : Spacing.xl,
  },
  headerTitle: {
    ...Typography.body,
    fontFamily: 'Medium',
    color: Colors.textSecondary,
  },
  iconButton: {
    padding: Spacing.md,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 320,
  },
  artwork: {
    borderRadius: Radius.xl * 2,
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
    color: Colors.surface,
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
  },
  controlsContainer: {
    gap: isVeryCompact ? Spacing.sm : Spacing.xl,
    marginTop: Spacing.xl,
  }
});
