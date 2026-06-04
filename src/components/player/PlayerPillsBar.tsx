import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../constants';
import { usePlayerAnimation } from '../../contexts/PlayerAnimationContext';
import Pill from '../ui/Pill';

import SaveIcon from '../../assets/icons/save-ribbon.svg';
import LyricsIcon from '../../assets/icons/lyrics.svg';
import QueueIcon from '../../assets/icons/queue.svg';
import TimerIcon from '../../assets/icons/timer-outline.svg';

export default function PlayerPillsBar() {
  const { toggleOverlay } = usePlayerAnimation();

  return (
    <View style={styles.pillsWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
        <Pill 
          icon={<SaveIcon width={20} height={20} color={Colors.background} />} 
          label="Save" 
        />
        <Pill 
          icon={<LyricsIcon width={20} height={20} color={Colors.background} />} 
          label="Lyrics" 
          onPress={() => toggleOverlay('lyrics')}
        />
        <Pill 
          icon={<QueueIcon width={20} height={20} color={Colors.background} />} 
          label="Queue" 
          onPress={() => toggleOverlay('queue')}
        />
        <Pill 
          icon={<TimerIcon width={20} height={20} color={Colors.background} />} 
          label="Sleep" 
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pillsWrapper: {
    marginHorizontal: -Spacing.xl, // Allow ScrollView to bleed to edges
  },
  pillsContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
});
