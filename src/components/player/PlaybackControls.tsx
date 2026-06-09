import { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Colors, Radius } from '../../constants';
import { usePlayer } from '../../hooks/usePlayer';
import { Haptic } from '../../services/haptics';

import ShuffleIcon from '../../assets/icons/shuffle.svg';
import RepeatIcon from '../../assets/icons/repeat.svg';
import PlayIcon from '../../assets/icons/play.svg';
import PauseIcon from '../../assets/icons/pause.svg';
import PrevIcon from '../../assets/icons/prev.svg';
import NextIcon from '../../assets/icons/next.svg';

export default function PlaybackControls() {
  const { isPlaying, play, pause, next, prev } = usePlayer();
  const radius = useSharedValue(isPlaying ? 24 : 40);

  const handlePlayPause = () => {
    Haptic.light();
    if (isPlaying) pause();
    else play();
  };
  const handleNext = () => {
    Haptic.light();
    next();
  };
  const handlePrev = () => {
    Haptic.light();
    prev();
  };

  useEffect(() => {
    radius.value = withTiming(
      isPlaying ? 24 : 40,
      {
        duration: 220,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }
    );
  }, [isPlaying]);

  return (
    <View style={styles.container}>
      {/* Shuffle */}
      <TouchableOpacity>
        <ShuffleIcon width={24} height={24} color={Colors.textPrimary} />
      </TouchableOpacity>

      {/* Prev */}
      <TouchableOpacity onPress={handlePrev} style={styles.circleButton}>
        <PrevIcon width={24} height={24} color={Colors.background} />
      </TouchableOpacity>

      {/* Play/Pause */}
      <TouchableOpacity
        onPress={handlePlayPause}
        style={[
          styles.playButton,
          {
            borderRadius: isPlaying ? 22 : Radius.full,
          },
        ]}
      >
        {isPlaying ? (
          <PauseIcon width={32} height={32} color={Colors.background} />
        ) : (
          <PlayIcon width={32} height={32} color={Colors.background} />
        )}
      </TouchableOpacity>

      {/* Next */}
      <TouchableOpacity onPress={handleNext} style={styles.circleButton}>
        <NextIcon width={24} height={24} color={Colors.background} />
      </TouchableOpacity>

      {/* Repeat */}
      <TouchableOpacity>
        <RepeatIcon width={24} height={24} color={Colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  circleButton: {
    width: 68,
    height: 68,
    borderRadius: 40,
    backgroundColor: Colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 90,
    height: 70,
    backgroundColor: Colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scale: 1.3 }],
  },

  innerButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
