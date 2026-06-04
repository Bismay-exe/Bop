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

const LyricsRow = React.memo(({ item, isActive }: { item: LyricsLine; isActive: boolean }) => {
  if (item.isSectionHeader) {
    return (
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionHeader}>{item.text}</Text>
      </View>
    );
  }

  return (
    <View style={styles.rowContainer}>
      <Text style={[
        styles.lineText,
        isActive ? styles.activeLine : styles.inactiveLine
      ]}>
        {item.text}
      </Text>
    </View>
  );
}, (prev, next) => prev.item.text === next.item.text && prev.isActive === next.isActive);

export default function LyricsSheet() {
  const { overlayProgress, overlayScrollY, overlayMode, setOverlayState, setOverlayMode } = usePlayerAnimation();
  const { height: currentHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const lyrics = currentTrack?.lyrics || [];
  const { position } = useProgress(250); // update every 250ms
  const listRef = React.useRef<any>(null);
  const userIsScrolling = React.useRef(false);

  // Find the active line based on timestamps
  const activeLineIndex = React.useMemo(() => {
    if (!lyrics.length || lyrics[0].timestamp === undefined) return 0;
    
    // Find the last lyric line that has a timestamp less than or equal to current position
    // Since lyrics are usually ordered, we can search backwards for efficiency or use simple findLastIndex.
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (lyrics[i].timestamp !== undefined && (lyrics[i].timestamp as number) <= position) {
        return i;
      }
    }
    return 0;
  }, [lyrics, position]);

  // Auto-scroll when active line changes
  React.useEffect(() => {
    if (listRef.current && lyrics.length > 0 && !userIsScrolling.current) {
      listRef.current.scrollToIndex({
        index: activeLineIndex,
        animated: true,
        viewPosition: 0.5, // Center the active item in the view
      });
    }
  }, [activeLineIndex, lyrics.length]);

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
    return <LyricsRow item={item} isActive={index === activeLineIndex} />;
  }, [activeLineIndex]);

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents={overlayMode === 'lyrics' ? 'auto' : 'none'}>
        {lyrics.length > 0 ? (
          <FlashList
            ref={listRef}
            data={lyrics}
            renderItem={renderItem}
            onScroll={handleScroll}
            onScrollBeginDrag={() => { userIsScrolling.current = true; }}
            onMomentumScrollEnd={() => { userIsScrolling.current = false; }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: currentHeight / 2 - 40,
              paddingBottom: currentHeight / 2,
              paddingHorizontal: Spacing.xl,
            }}
          />
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
    paddingVertical: Spacing.sm,
  },
  lineText: {
    fontFamily: "Medium",
    fontSize: 32, // Override for larger lyrics
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
