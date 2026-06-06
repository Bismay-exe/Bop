import { StyleSheet, useWindowDimensions, View, TouchableOpacity, BackHandler } from 'react-native';
import React, { useEffect } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, interpolateColor, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProgress } from 'react-native-track-player';
import PlayIcon from '../../assets/icons/play.svg';
import PauseIcon from '../../assets/icons/pause.svg';
import { Colors, Radius } from '../../constants';
import { usePlayerAnimation } from '../../contexts/PlayerAnimationContext';
import { usePlayerLayoutStore } from '../../store/playerLayoutStore';
import { usePlayerStore } from '../../store/playerStore';
import { usePlayer } from '../../hooks/usePlayer';
import { useLibraryStore } from '../../store/libraryStore';
import ArtworkView from './ArtworkView';
import ExpandedPlayer from './ExpandedPlayer';
import MiniPlayer from './MiniPlayer';
import QueueSheet from './QueueSheet';
import LyricsSheet from './LyricsSheet';
import ProgressBar from './ProgressBar';

import HeartIcon from '../../assets/icons/heart.svg';

const BOTTOM_NAV_HEIGHT = 60; // Approximate tab bar height for Phase 1

export default function PersistentPlayer() {
  const { expandProgress, transitionState, setTransitionState, overlayProgress, overlayState, setOverlayState, overlayScrollY, overlayMode, toggleOverlay, collapseCurrentLayer } = usePlayerAnimation();
  const { height: currentHeight, width } = useWindowDimensions();
  const isVeryCompact = currentHeight < 700;
  const isCompact = currentHeight < 820;
  const insets = useSafeAreaInsets();
  const miniPlayerHeight = 72 + insets.bottom;

  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPlaying = usePlayerStore(state => state.playbackState === 'playing');
  const { position, duration } = useProgress();
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const favorites = useLibraryStore(state => state.favorites);
  const toggleFavoriteStore = useLibraryStore(state => state.toggleFavorite);
  const isLiked = currentTrack ? favorites.has(currentTrack.id) : false;

  const handleToggleFavorite = () => {
    if (currentTrack) {
      toggleFavoriteStore(currentTrack.id);
    }
  };

  const { play, pause } = usePlayer();
  const togglePlayback = () => {
    if (isPlaying) pause();
    else play();
  };

  // Internal state tracking for gesture
  const startProgress = useSharedValue(0);
  const startOverlayProgress = useSharedValue(0);
  const isDraggingOverlay = useSharedValue(false);
  const touchStartY = useSharedValue(0);

  const togglePlayer = () => {
    if (transitionState === 'expanded' || transitionState === 'expanding') {
      setTransitionState('collapsing');
      expandProgress.value = withTiming(0, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });
      setTimeout(() => setTransitionState('collapsed'), 400);
    } else {
      setTransitionState('expanding');
      expandProgress.value = withTiming(1, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });
      setTimeout(() => setTransitionState('expanded'), 400);
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      return collapseCurrentLayer();
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
    };
  }, [collapseCurrentLayer]);

  const panGesture = Gesture.Pan()
    .onTouchesDown((e, manager) => {
      'worklet';
      touchStartY.value = e.changedTouches[0].y;

      if (overlayProgress.value > 0.5 && overlayMode === 'lyrics') {
        const topHeaderHeight = 24 + 56 + 32;
        if (e.changedTouches[0].y > topHeaderHeight + 50) {
          manager.fail();
        }
      }
    })
    .onTouchesMove((e, manager) => {
      'worklet';
      // If an overlay sheet is visible...
      if (overlayProgress.value > 0.5) {
        const currentY = e.changedTouches[0].y;
        const isDraggingUp = currentY < touchStartY.value;
        
        // In lyrics mode, if they dragged from the top header, let them close it.
        // Queue mode logic remains:
        if (overlayMode !== 'lyrics') {
          if (overlayScrollY.value > 5 || isDraggingUp) {
            manager.fail();
          }
        }
      }
    })
    .activeOffsetY([-10, 10])
    .onStart(() => {
      if (overlayProgress.value > 0.05) { // If overlay is mostly open or opening
        isDraggingOverlay.value = true;
        startOverlayProgress.value = overlayProgress.value;
        if (overlayProgress.value < 0.5) runOnJS(setOverlayState)('opening');
        else runOnJS(setOverlayState)('closing');
      } else {
        isDraggingOverlay.value = false;
        startProgress.value = expandProgress.value;
        if (expandProgress.value < 0.5) runOnJS(setTransitionState)('expanding');
        else runOnJS(setTransitionState)('collapsing');
      }
    })
    .onUpdate((e) => {
      if (isDraggingOverlay.value) {
        const topHeaderHeight = Math.max(insets.top, 24) + 56 + 32;
        const totalDistance = currentHeight - topHeaderHeight;
        const progressDelta = -e.translationY / totalDistance;
        let newProgress = startOverlayProgress.value + progressDelta;

        newProgress = Math.max(0, Math.min(1, newProgress));
        overlayProgress.value = newProgress;
      } else {
        // Calculate how much we've dragged as a fraction of the total expandable distance
        const totalDistance = currentHeight - miniPlayerHeight - BOTTOM_NAV_HEIGHT;
        // translationY is negative when dragging UP.
        const progressDelta = -e.translationY / totalDistance;
        let newProgress = startProgress.value + progressDelta;

        // Clamp between 0 and 1
        newProgress = Math.max(0, Math.min(1, newProgress));
        expandProgress.value = newProgress;
      }
    })
    .onEnd((e) => {
      if (isDraggingOverlay.value) {
        const topHeaderHeight = Math.max(insets.top, 24) + 56 + 32;
        const totalDistance = currentHeight - topHeaderHeight;
        const velocityProgress = -e.velocityY / totalDistance;
        const projectedProgress = overlayProgress.value + velocityProgress * 0.2;

        if (projectedProgress > 0.5) {
          overlayProgress.value = withTiming(1, {
            duration: 400,
            easing: Easing.bezier(0.32, 0.72, 0, 1)
          });
          runOnJS(setOverlayState)('open');
        } else {
          overlayProgress.value = withTiming(0, {
            duration: 400,
            easing: Easing.bezier(0.32, 0.72, 0, 1)
          });
          runOnJS(setOverlayState)('closed');
        }
      } else {
        const totalDistance = currentHeight - miniPlayerHeight - BOTTOM_NAV_HEIGHT;
        // Use velocity to help snap
        const velocityProgress = -e.velocityY / totalDistance;
        const projectedProgress = expandProgress.value + velocityProgress * 0.2; // project 200ms into future

        if (projectedProgress > 0.5) {
          // Snap to expanded
          expandProgress.value = withTiming(1, {
            duration: 400,
            easing: Easing.bezier(0.32, 0.72, 0, 1)
          });
          runOnJS(setTransitionState)('expanded');
        } else {
          // Snap to collapsed
          expandProgress.value = withTiming(0, {
            duration: 400,
            easing: Easing.bezier(0.32, 0.72, 0, 1)
          });
          runOnJS(setTransitionState)('collapsed');
        }
      }
    });

  const layoutState = usePlayerLayoutStore();

  const containerStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(expandProgress.value, [0, 1], [miniPlayerHeight, currentHeight]),
      // No border radius here since the Home screen gets the radius instead
    };
  });

  const miniPlayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - expandProgress.value,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: miniPlayerHeight,
  }));

  // Remove animatedProps for pointerEvents to avoid Reanimated Android bugs

  const expandedPlayerStyle = useAnimatedStyle(() => {
    const fadeOutAmount = overlayMode === 'queue' ? interpolate(overlayProgress.value, [0, 1], [1, 0]) : 1;
    return {
      opacity: interpolate(expandProgress.value, [0, 1], [0, 1]) * fadeOutAmount,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: currentHeight,
      zIndex: 16,
    };
  });

  // Remove animatedProps for pointerEvents to avoid Reanimated Android bugs


  // Mathematical Layout Constants
  const miniArtworkSize = 56;
  const miniArtworkX = 24; // Spacing.xl
  const miniArtworkY = 16; // paddingTop: 16

  const expandedArtworkSize = isVeryCompact ? width * 0.50 : isCompact ? width * 0.65 : width * 0.82;
  const expandedArtworkX = (width - expandedArtworkSize) / 2;
  const headerHeight = 28 + (isVeryCompact ? 8 : 24);
  const centerSectionHeight = currentHeight - Math.max(insets.top, 24) - headerHeight - Math.max(insets.bottom, 24);
  const expandedArtworkY = Math.max(insets.top, 24) + headerHeight + (centerSectionHeight - expandedArtworkSize) / 2 - 160;

  const miniTitleX = 24 + 56 + 12; // 92
  const miniTitleY = 20;
  const expandedTitleX = 24;
  const expandedTitleY = currentHeight - Math.max(insets.bottom, 24) - 296;

  const miniArtistX = 92;
  const miniArtistY = 40; // Moved up to match title closeness
  const expandedArtistX = 24;
  const expandedArtistY = currentHeight - Math.max(insets.bottom, 24) - 264;

  // Queue Top Header Constants
  const topHeaderContainerY = Math.max(insets.top, 24) - 0;
  const topHeaderArtworkY = topHeaderContainerY + miniArtworkY;
  const topHeaderTitleY = topHeaderArtworkY + 4; // Title starts slightly below artwork top
  const topHeaderArtistY = topHeaderTitleY + 20; // 20px below title (moved up)

  // Width limits so text doesn't overflow
  const miniTextWidth = width - 92 - 94; // 94 = 24 padding + 48 play btn + 22 inner
  const expandedTextWidth = width - 24 - 80; // 80 = 24 padding + 40 heart btn + 16 inner

  const ghostArtworkStyle = useAnimatedStyle(() => {
    const containerHeight = interpolate(expandProgress.value, [0, 1], [miniPlayerHeight, currentHeight]);
    const containerY = currentHeight - containerHeight;

    const expandSize = interpolate(expandProgress.value, [0, 1], [miniArtworkSize, expandedArtworkSize]);
    const expandX = interpolate(expandProgress.value, [0, 1], [miniArtworkX, expandedArtworkX]);
    const expandY = interpolate(expandProgress.value, [0, 1], [currentHeight - miniPlayerHeight + miniArtworkY, expandedArtworkY]);
    const expandRadius = interpolate(expandProgress.value, [0, 1], [Radius.md, Radius.xl * 2]);

    const size = interpolate(overlayProgress.value, [0, 1], [expandSize, miniArtworkSize]);
    const x = interpolate(overlayProgress.value, [0, 1], [expandX, miniArtworkX]);
    const absoluteY = interpolate(overlayProgress.value, [0, 1], [expandY, topHeaderArtworkY]);
    const radius = interpolate(overlayProgress.value, [0, 1], [expandRadius, Radius.md]);

    return {
      position: 'absolute',
      left: x,
      top: absoluteY - containerY,
      width: size,
      height: size,
      borderRadius: radius,
      overflow: 'hidden',
      zIndex: 20,
    };
  });

  const ghostTitleStyle = useAnimatedStyle(() => {
    const containerHeight = interpolate(expandProgress.value, [0, 1], [miniPlayerHeight, currentHeight]);
    const containerY = currentHeight - containerHeight;

    const expandX = interpolate(expandProgress.value, [0, 1], [miniTitleX, expandedTitleX]);
    const expandY = interpolate(expandProgress.value, [0, 1], [currentHeight - miniPlayerHeight + miniTitleY, expandedTitleY]);
    const expandW = interpolate(expandProgress.value, [0, 1], [miniTextWidth, expandedTextWidth]);
    const expandFontSize = interpolate(expandProgress.value, [0, 1], [15, 24]);

    const x = interpolate(overlayProgress.value, [0, 1], [expandX, miniTitleX]);
    const absoluteY = interpolate(overlayProgress.value, [0, 1], [expandY, topHeaderTitleY]);
    const w = interpolate(overlayProgress.value, [0, 1], [expandW, miniTextWidth]);
    const fontSize = interpolate(overlayProgress.value, [0, 1], [expandFontSize, 15]);

    return {
      position: 'absolute',
      left: x,
      top: absoluteY - containerY,
      width: w,
      fontSize,
      fontFamily: 'Medium',
      color: '#FFFFFF',
      zIndex: 20,
    };
  });

  const ghostArtistStyle = useAnimatedStyle(() => {
    const containerHeight = interpolate(expandProgress.value, [0, 1], [miniPlayerHeight, currentHeight]);
    const containerY = currentHeight - containerHeight;

    const expandX = interpolate(expandProgress.value, [0, 1], [miniArtistX, expandedArtistX]);
    const expandY = interpolate(expandProgress.value, [0, 1], [currentHeight - miniPlayerHeight + miniArtistY, expandedArtistY]);
    const expandW = interpolate(expandProgress.value, [0, 1], [miniTextWidth, expandedTextWidth]);
    const expandFontSize = interpolate(expandProgress.value, [0, 1], [12, 16]);

    const x = interpolate(overlayProgress.value, [0, 1], [expandX, miniArtistX]);
    const absoluteY = interpolate(overlayProgress.value, [0, 1], [expandY, topHeaderArtistY]);
    const w = interpolate(overlayProgress.value, [0, 1], [expandW, miniTextWidth]);
    const fontSize = interpolate(overlayProgress.value, [0, 1], [expandFontSize, 12]);

    return {
      position: 'absolute',
      left: x,
      top: absoluteY - containerY,
      width: w,
      fontSize,
      fontFamily: 'Medium',
      color: 'rgba(255,255,255,0.5)',
      zIndex: 20,
    };
  });

  const ghostHeartStyle = useAnimatedStyle(() => {
    const containerHeight = interpolate(expandProgress.value, [0, 1], [miniPlayerHeight, currentHeight]);
    const containerY = currentHeight - containerHeight;

    // Heart is positioned next to text in ExpandedPlayer
    const expandedX = width - 24 - 40; // right 24 padding, 40 width approx
    const expandedY = expandedTitleY + 4; // vertically aligned with text

    const headerX = width - 24 - 40;
    const headerY = topHeaderTitleY;

    const x = interpolate(overlayProgress.value, [0, 1], [expandedX, headerX]);
    const absoluteY = interpolate(overlayProgress.value, [0, 1], [expandedY, headerY]);
    
    // Fade out Heart icon when going down to mini player, or if overlay is queue mode
    const baseOpacity = interpolate(expandProgress.value, [0.5, 1], [0, 1]);
    const finalOpacity = overlayMode === 'queue' 
      ? interpolate(overlayProgress.value, [0, 0.5], [baseOpacity, 0])
      : baseOpacity;

    return {
      position: 'absolute',
      left: x,
      top: absoluteY - containerY,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: finalOpacity,
      zIndex: 20,
    };
  });

  const ghostHeartProps = useAnimatedProps(() => ({
    pointerEvents: expandProgress.value > 0.5 ? ('auto' as const) : ('none' as const),
  }));

  const ghostPlayButtonStyle = useAnimatedStyle(() => {
    const opacity = overlayMode === 'queue' ? interpolate(overlayProgress.value, [0, 0.5, 1], [0, 0, 1]) : 0;
    return {
      position: 'absolute',
      right: 32,
      top: topHeaderArtworkY + 4, // Centered vertically with artwork
      opacity,
      zIndex: 20,
    };
  });

  const ghostPlayButtonProps = useAnimatedProps(() => ({
    pointerEvents: (overlayMode === 'queue' && overlayProgress.value > 0.5) ? ('auto' as const) : ('none' as const),
  }));

  const ghostProgressBarStyle = useAnimatedStyle(() => {
    const opacity = overlayMode === 'queue' ? interpolate(overlayProgress.value, [0, 0.5, 1], [0, 0, 1]) : 0;
    return {
      position: 'absolute',
      left: miniTitleX,
      right: 24,
      top: topHeaderArtworkY + 56 - 12, // Adjusted for ProgressBar's 12px height
      opacity,
      zIndex: 20,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, containerStyle]}>

        {/* Lyrics Sheet Layer (At the very back, below ExpandedPlayer) */}
        <LyricsSheet />

        {/* Expanded Player Layer */}
        <Animated.View 
          style={expandedPlayerStyle} 
          pointerEvents={(transitionState === 'collapsed' || (overlayMode === 'queue' && overlayState !== 'closed')) ? 'none' : 'box-none'}
        >
          <ExpandedPlayer onCollapse={togglePlayer} />
        </Animated.View>

        {/* Queue Sheet Layer (Below ghost elements but above expanded player) */}
        <QueueSheet />

        {/* Mini Player Layer */}
        <Animated.View 
          style={miniPlayerStyle} 
          pointerEvents={transitionState === 'expanded' ? 'none' : 'auto'}
        >
          <MiniPlayer onExpand={togglePlayer} />
        </Animated.View>

        {/* Floating Shared Elements */}
        <Animated.View style={ghostArtworkStyle} pointerEvents="none">
          <ArtworkView 
            uri={currentTrack?.artwork} 
            size={width} 
            style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }} 
            disableTransition 
          />
        </Animated.View>

        <Animated.Text style={ghostTitleStyle} numberOfLines={1} pointerEvents="none">
          {currentTrack?.title || 'Not Playing'}
        </Animated.Text>

        <Animated.Text style={ghostArtistStyle} numberOfLines={1} pointerEvents="none">
          {currentTrack?.artist || '—'}
        </Animated.Text>

        <Animated.View style={ghostHeartStyle} animatedProps={ghostHeartProps}>
          <TouchableOpacity onPress={handleToggleFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <HeartIcon 
              width={24} 
              height={24} 
              color={Colors.background} 
              fill={isLiked ? Colors.background : "none"} 
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Ghost Progress Bar (Only visible in Queue Top Header state) */}
        <Animated.View style={ghostProgressBarStyle} animatedProps={ghostPlayButtonProps}>
          <ProgressBar variant="mini" />
        </Animated.View>

        {/* Ghost Play Button (Only visible in Queue Top Header state) */}
        <Animated.View style={[ghostPlayButtonStyle, styles.playButton]} animatedProps={ghostPlayButtonProps}>
          <TouchableOpacity onPress={togglePlayback}>
            {isPlaying ? (
              <PauseIcon width={20} height={20} color={Colors.textPrimary} />
            ) : (
              <PlayIcon width={20} height={20} color={Colors.textPrimary} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Touch overlay to close Lyrics when tapping top miniplayer area */}
        {overlayMode === 'lyrics' && (
          <TouchableOpacity 
            style={[styles.lyricsCloseOverlay, { height: topHeaderArtworkY + 60 }]} 
            onPress={() => toggleOverlay('lyrics')}
            activeOpacity={1}
          />
        )}

      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000', // Pitch black for both Mini and Expanded
    zIndex: 20,
    overflow: 'hidden',
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2, // optical alignment
  },
  lyricsCloseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 25,
  }
});
