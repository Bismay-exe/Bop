import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation, useSharedValue, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useProgress } from 'react-native-track-player';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../constants';
import { usePlayerAnimation } from '../../contexts/PlayerAnimationContext';
import { usePlayerStore } from '../../store/playerStore';
import { LyricsLine } from '../../types';

import { SharedValue } from 'react-native-reanimated';

const LyricsRow = React.memo(({ item, index, activeLineIndex }: { item: LyricsLine; index: number; activeLineIndex: SharedValue<number> }) => {
  if (item.isSectionHeader) {
    return (
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionHeader}>{item.text}</Text>
      </View>
    );
  }

  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(activeLineIndex.value - index);
    
    let opacity = 0.2; // Distant
    if (activeLineIndex.value === -1) {
      opacity = 0.6; // Fallback if no active line
    } else if (distance === 0) {
      opacity = 1.0; // Active
    } else if (distance === 1) {
      opacity = 0.6; // Adjacent
    }

    return {
      opacity: withTiming(opacity, { duration: 250 }),
    };
  });

  return (
    <View style={styles.rowContainer}>
      <Animated.Text style={[styles.lineText, animatedStyle, { color: '#FFFFFF' }]}>
        {item.text}
      </Animated.Text>
    </View>
  );
}, (prev, next) => prev.item.text === next.item.text && prev.index === next.index);

export default function LyricsSheet() {
  const { overlayProgress, overlayScrollY, overlayMode, setOverlayState, setOverlayMode } = usePlayerAnimation();
  const { height: currentHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const onlineLyrics = usePlayerStore(state => state.onlineLyrics);
  const isFetchingLyrics = usePlayerStore(state => state.isFetchingLyrics);
  
  // Prioritize embedded lyrics, then synced online, then plain online
  const lyrics = currentTrack?.lyrics || onlineLyrics?.syncedLyrics || onlineLyrics?.plainLyrics || [];
  
  const { position } = useProgress(250); // update every 250ms
  const listRef = React.useRef<any>(null);
  const userIsScrolling = React.useRef(false);

  const sharedActiveLineIndex = useSharedValue(-1);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Find the active line based on timestamps and manage scroll trigger
  React.useEffect(() => {
    if (!lyrics.length || lyrics[0].timestamp === undefined) {
      sharedActiveLineIndex.value = -1;
      return;
    }
    
    const positionMs = position * 1000;
    let newIndex = 0;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (lyrics[i].timestamp !== undefined && (lyrics[i].timestamp as number) <= positionMs) {
        newIndex = i;
        break;
      }
    }
    
    if (sharedActiveLineIndex.value !== newIndex) {
      sharedActiveLineIndex.value = newIndex;
      
      // Stabilization micro-delay before scroll (50-120ms)
      if (!userIsScrolling.current && listRef.current) {
        setTimeout(() => {
          if (!userIsScrolling.current && listRef.current) {
            listRef.current.scrollToIndex({
              index: newIndex,
              animated: true,
              viewPosition: 0.4, // Cinematic center (40%)
            });
          }
        }, 100);
      }
    }
  }, [lyrics, position]);

  const handleScrollBeginDrag = useCallback(() => {
    userIsScrolling.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  const handleMomentumScrollEnd = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      userIsScrolling.current = false;
      // Optionally snap back immediately if we have an active line
      if (listRef.current && sharedActiveLineIndex.value !== -1) {
         listRef.current.scrollToIndex({
            index: sharedActiveLineIndex.value,
            animated: true,
            viewPosition: 0.4,
         });
      }
    }, 3000);
  }, [sharedActiveLineIndex]);

  const topHeaderHeight = Math.max(insets.top, 24) + 56 + 32;
  const bottomControlsHeight = Math.max(insets.bottom, 58) + 120; // Approx height for PlaybackControls + progress bar

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayMode === 'lyrics' ? interpolate(overlayProgress.value, [0, 0.5, 1], [0, 0, 1]) : 0,
      transform: [
        {
          translateY: overlayMode === 'lyrics' ? interpolate(
            overlayProgress.value,
            [0, 1],
            [currentHeight, 0],
            Extrapolation.CLAMP
          ) : currentHeight
        }
      ]
    };
  });

  const handleScroll = (event: any) => {
    overlayScrollY.value = event.nativeEvent.contentOffset.y;
  };

  const renderItem = useCallback(({ item, index }: { item: LyricsLine, index: number }) => {
    return <LyricsRow item={item} index={index} activeLineIndex={sharedActiveLineIndex} />;
  }, [sharedActiveLineIndex]);

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents={overlayMode === 'lyrics' ? 'auto' : 'none'}>
        {lyrics.length > 0 ? (
          <FlashList
            ref={listRef}
            data={lyrics}
            renderItem={renderItem}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: currentHeight / 2 - 40,
              paddingBottom: currentHeight / 2,
              paddingHorizontal: Spacing.xl,
            }}
          />
        ) : isFetchingLyrics ? (
          <View style={styles.emptyContainer}>
            <Animated.Text style={[styles.emptyText, { opacity: 0.5 }]}>Fetching Lyrics...</Animated.Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No Lyrics Found</Text>
          </View>
        )}

        {/* Top Header Blur & Gradient Protector */}
        <Animated.View style={[styles.blurTop, { height: topHeaderHeight + 5 }]} pointerEvents="auto">
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          <LinearGradient
            colors={['rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 1)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Bottom Controls Blur & Gradient Protector */}
        <Animated.View style={[styles.blurBottom, { height: bottomControlsHeight + 25 }]} pointerEvents="auto">
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 15,
  },
  rowContainer: {
    paddingVertical: Spacing.sm * 1.5,
  },
  lineText: {
    fontFamily: "Medium",
    fontSize: 28, // Override for larger lyrics
    textAlign: 'left',
  },
  activeLine: {
    color: '#FFFFFF',
  },
  inactiveLine: {
    color: 'rgba(255, 255, 255, 0.2)',
    // transform: [{ scale: 0.95 }], // Proximity typography hook
  },
  sectionHeaderContainer: {
    paddingVertical: Spacing.xl,
  },
  sectionHeader: {
    ...Typography.label,
    color: Colors.primary, // Or rgba(255,255,255,0.7)
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  blurTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  blurBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  }
});
