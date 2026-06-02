import { View, Text, StyleSheet } from 'react-native';
import { useProgress } from 'react-native-track-player';
import Slider from '@react-native-community/slider';
import { Colors, Typography, Spacing } from '../../constants';
import { usePlayer } from '../../hooks/usePlayer';

// Need to run: npx expo install @react-native-community/slider

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface Props {
  variant?: 'full' | 'mini';
}

export default function ProgressBar({ variant = 'full' }: Props) {
  const { position, duration } = useProgress();
  const { seekTo } = usePlayer();

  return (
    <View style={[styles.container, variant === 'mini' && styles.miniContainer]}>
      <Slider
        style={[styles.slider, variant === 'mini' && styles.miniSlider]}
        minimumValue={0}
        maximumValue={duration || 1}
        value={position}
        minimumTrackTintColor={Colors.surface}
        maximumTrackTintColor={Colors.textSecondary}
        thumbTintColor='transparent'
        onSlidingComplete={seekTo}
      />
      {variant === 'full' && (
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatDuration(position)}</Text>
          <Text style={styles.timeText}>-{formatDuration(Math.max(0, duration - position))}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  slider: {
    width: '107%',
    height: 10,
    alignSelf: 'center',
    transform: [{ scaleY: 2 }],
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.sm,
  },
  timeText: {
    ...Typography.bodyMedium,
    fontFamily:'Medium',
    color: Colors.surface,
  },
  miniContainer: {
    width: '100%',
    height: 12,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  miniSlider: {
    height: 12,
    alignSelf: 'stretch',
    transform: [{ scaleY: 2.2 }],
    marginLeft: -14, // offset internal thumb padding
    marginRight: -14,
  },
});
