import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { Colors, Spacing, Typography, Radius } from '../../constants';
import { usePlayerAnimation } from '../../contexts/PlayerAnimationContext';
import { usePlayer } from '../../hooks/usePlayer';
import { Song } from '../../types';

// We'll bring back a copy of PillsBar for the Queue Sheet top section
import PlayerPillsBar from './PlayerPillsBar';

export default function QueueSheet() {
  const { queueProgress, queueScrollY } = usePlayerAnimation();
  const { height: currentHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { queue, currentTrack, skip } = usePlayer();

  // The Top Header takes up roughly: insets.top + 24 (margin) + 56 (artwork) + 24 (bottom padding) = 104 + insets.top
  const topHeaderHeight = Math.max(insets.top, 24) + 56 + 32;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            queueProgress.value,
            [0, 1],
            [currentHeight, topHeaderHeight],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });
  
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    queueScrollY.value = event.nativeEvent.contentOffset.y;
  };

  const renderItem = ({ item, index }: { item: Song & { queueId: string }, index: number }) => {
    const isPlaying = currentTrack?.id === item.id;
    
    return (
      <TouchableOpacity 
        style={[styles.itemContainer, isPlaying && styles.itemPlaying]}
        onPress={() => skip(index)}
      >
        {item.artwork ? (
          <ExpoImage
            source={{ uri: item.artwork }}
            style={styles.itemArtwork}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.itemArtwork, styles.itemArtworkFallback]}>
            <Ionicons name="musical-note" size={18} color={Colors.textSecondary} />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={[styles.title, isPlaying && styles.textPlaying]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.artist, isPlaying && styles.textPlaying]} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
        {isPlaying ? (
          <Ionicons name="stats-chart" size={16} color={Colors.primary} />
        ) : (
          <Ionicons name="menu" size={24} color={Colors.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Small drag handle indicator */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      <FlashList
        data={queue}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        keyExtractor={(item) => item.queueId}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: Colors.background, // Use a contrasting color for the sheet
    borderTopLeftRadius: Radius.xl * 1.5,
    borderTopRightRadius: Radius.xl * 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 5, // Below the Ghost text/artwork in PersistentPlayer, but above the ExpandedPlayer
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  listContent: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 18,
  },
  itemPlaying: {
    backgroundColor: Colors.surface,
  },
  itemArtwork: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    marginRight: Spacing.md,
  },
  itemArtworkFallback: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontFamily: 'Medium',
    marginBottom: 4,
  },
  artist: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontFamily: 'Regular',
  },
  textPlaying: {
    color: Colors.primary,
  },
});
