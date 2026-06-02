import React, { createContext, useContext, useState } from 'react';
import { SharedValue, useSharedValue, withTiming, Easing } from 'react-native-reanimated';

export type PlayerTransitionState = 'collapsed' | 'expanding' | 'expanded' | 'collapsing';
export type QueueTransitionState = 'closed' | 'opening' | 'open' | 'closing';

interface PlayerAnimationContextType {
  expandProgress: SharedValue<number>;
  transitionState: PlayerTransitionState;
  setTransitionState: (state: PlayerTransitionState) => void;
  queueProgress: SharedValue<number>;
  queueState: QueueTransitionState;
  setQueueState: (state: QueueTransitionState) => void;
  toggleQueue: () => void;
  queueScrollY: SharedValue<number>;
}

const PlayerAnimationContext = createContext<PlayerAnimationContextType | null>(null);

export function PlayerAnimationProvider({ children }: { children: React.ReactNode }) {
  const expandProgress = useSharedValue(0); // 0 = MiniPlayer, 1 = Full Player
  const [transitionState, setTransitionState] = useState<PlayerTransitionState>('collapsed');
  
  const queueProgress = useSharedValue(0); // 0 = Player, 1 = Queue
  const [queueState, setQueueState] = useState<QueueTransitionState>('closed');
  const queueScrollY = useSharedValue(0);

  const toggleQueue = React.useCallback(() => {
    if (queueState === 'open' || queueState === 'opening') {
      setQueueState('closing');
      queueProgress.value = withTiming(0, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });
      setTimeout(() => setQueueState('closed'), 400);
    } else {
      setQueueState('opening');
      queueProgress.value = withTiming(1, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });
      setTimeout(() => setQueueState('open'), 400);
    }
  }, [queueState, queueProgress]);

  return (
    <PlayerAnimationContext.Provider 
      value={{ 
        expandProgress, transitionState, setTransitionState,
        queueProgress, queueState, setQueueState, toggleQueue,
        queueScrollY
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
