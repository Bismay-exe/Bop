import React, { createContext, useContext, useState } from 'react';
import { SharedValue, useSharedValue, withTiming, Easing } from 'react-native-reanimated';

export type PlayerTransitionState = 'collapsed' | 'expanding' | 'expanded' | 'collapsing';

export type PlayerOverlayMode = 'none' | 'queue' | 'lyrics';
export type OverlayTransitionState = 'closed' | 'opening' | 'open' | 'closing';

interface PlayerAnimationContextType {
  expandProgress: SharedValue<number>;
  transitionState: PlayerTransitionState;
  setTransitionState: (state: PlayerTransitionState) => void;
  
  overlayMode: PlayerOverlayMode;
  setOverlayMode: (mode: PlayerOverlayMode) => void;
  overlayProgress: SharedValue<number>;
  overlayState: OverlayTransitionState;
  setOverlayState: (state: OverlayTransitionState) => void;
  toggleOverlay: (mode: PlayerOverlayMode) => void;
  
  overlayScrollY: SharedValue<number>; // shared for both queue and lyrics scroll offset
  collapseCurrentLayer: () => boolean;
}

const PlayerAnimationContext = createContext<PlayerAnimationContextType | null>(null);

export function PlayerAnimationProvider({ children }: { children: React.ReactNode }) {
  const expandProgress = useSharedValue(0); // 0 = MiniPlayer, 1 = Full Player
  const [transitionState, setTransitionState] = useState<PlayerTransitionState>('collapsed');
  
  const [overlayMode, setOverlayMode] = useState<PlayerOverlayMode>('none');
  const overlayProgress = useSharedValue(0); // 0 = Expanded Player, 1 = Active Overlay
  const [overlayState, setOverlayState] = useState<OverlayTransitionState>('closed');
  const overlayScrollY = useSharedValue(0);

  const toggleOverlay = React.useCallback((mode: PlayerOverlayMode) => {
    // If we're closing the current overlay, or if the user clicks a different overlay while one is open
    if (overlayState === 'open' || overlayState === 'opening') {
      // If clicking the same overlay that is already open -> Close it
      if (overlayMode === mode) {
        setOverlayState('closing');
        overlayProgress.value = withTiming(0, {
          duration: 400,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1)
        });
        setTimeout(() => {
          setOverlayState('closed');
          setOverlayMode('none');
        }, 400);
      } else {
        // If switching overlays, swap mode instantly
        setOverlayMode(mode);
      }
    } else {
      // Opening a new overlay
      setOverlayMode(mode);
      setOverlayState('opening');
      overlayProgress.value = withTiming(1, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });
      setTimeout(() => setOverlayState('open'), 400);
    }
  }, [overlayState, overlayMode, overlayProgress]);

  const transitionStateRef = React.useRef(transitionState);
  transitionStateRef.current = transitionState;
  
  const overlayStateRef = React.useRef(overlayState);
  overlayStateRef.current = overlayState;

  const collapseCurrentLayer = React.useCallback(() => {
    if (overlayStateRef.current !== 'closed' && overlayStateRef.current !== 'closing') {
      setOverlayState('closing');
      overlayProgress.value = withTiming(0, {
        duration: 300,
        easing: Easing.bezier(0.32, 0.72, 0, 1)
      });
      setTimeout(() => {
        setOverlayState('closed');
        setOverlayMode('none');
      }, 300);
      return true;
    }
    if (transitionStateRef.current !== 'collapsed' && transitionStateRef.current !== 'collapsing') {
      setTransitionState('collapsing');
      expandProgress.value = withTiming(0, {
        duration: 300,
        easing: Easing.bezier(0.32, 0.72, 0, 1)
      });
      setTimeout(() => setTransitionState('collapsed'), 300);
      return true;
    }
    return false;
  }, []);

  return (
    <PlayerAnimationContext.Provider 
      value={{ 
        expandProgress, transitionState, setTransitionState,
        overlayMode, setOverlayMode, overlayProgress, overlayState, setOverlayState, toggleOverlay,
        overlayScrollY, collapseCurrentLayer
      }}
    >
      {children}
    </PlayerAnimationContext.Provider>
  );
}

export function usePlayerAnimation() {
  const context = useContext(PlayerAnimationContext);
  if (!context) {
    throw new Error('usePlayerAnimation must be used within a PlayerAnimationProvider');
  }
  return context;
}
