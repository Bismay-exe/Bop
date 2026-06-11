import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ErrorBoundary from './ErrorBoundary';
import { useLibraryStore } from '../store/libraryStore';
import { useSettingsStore } from '../store/settingsStore';
import { setupTrackPlayer, startEventSync } from '../services/TrackPlayerService';
import { registerAudioFocusHandlers } from '../services/AudioFocusService';
import { PlayerAnimationProvider, usePlayerAnimation } from '../contexts/PlayerAnimationContext';
import PersistentPlayer from '../components/player/PersistentPlayer';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { Dimensions, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants';

export { ErrorBoundary };

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import TrackPlayer from 'react-native-track-player';
TrackPlayer.registerPlaybackService(() => require('../services/playbackService'));

function AnimatedAppContainer({ children }: { children: React.ReactNode }) {
  const { expandProgress } = usePlayerAnimation();
  const { height: currentHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const miniPlayerHeight = 72 + insets.bottom;
  
  const animatedStyle = useAnimatedStyle(() => ({
    height: interpolate(expandProgress.value, [0, 1], [currentHeight - miniPlayerHeight, 0]),
    borderBottomLeftRadius: interpolate(expandProgress.value, [0, 1], [36, 36]),
    borderBottomRightRadius: interpolate(expandProgress.value, [0, 1], [36, 36]),
    overflow: 'hidden',
  }));

  return (
    <Animated.View style={[animatedStyle, { zIndex: 10, width: '100%', backgroundColor: Colors.background }]}>
      {children}
    </Animated.View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Light': require('../../assets/fonts/GeneralSans-Light.ttf'),
    'Regular': require('../../assets/fonts/GeneralSans-Regular.ttf'),
    'Medium': require('../../assets/fonts/GeneralSans-Medium.ttf'),
    'Semibold': require('../../assets/fonts/GeneralSans-Semibold.ttf'),
    'Bold': require('../../assets/fonts/GeneralSans-Bold.ttf'),
  });

  const hydrate = useLibraryStore((state) => state.hydrate);

  useEffect(() => {
    let unsubscribeEvents: (() => void) | undefined;
    let unsubscribeFocus: (() => void) | undefined;

    const initApp = async () => {
      // 0. Load persisted user settings (synchronous MMKV read)
      useSettingsStore.getState().hydrate();

      // 1. Hydrate library first (we need songs to restore playback)
      await hydrate();

      // 2. Setup TrackPlayer singleton
      await setupTrackPlayer();

      // 3. Start listeners
      unsubscribeEvents = startEventSync();
      unsubscribeFocus = registerAudioFocusHandlers();

      // 4. Restore playback state (requires both store and TrackPlayer)
      if (useSettingsStore.getState().resumeLastSession) {
        const { restorePlaybackSnapshot } = require('../services/StorageService');
        await restorePlaybackSnapshot();
      }
    };

    initApp();

    return () => {
      if (unsubscribeEvents) unsubscribeEvents();
      if (unsubscribeFocus) unsubscribeFocus();
    };
  }, [hydrate]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PlayerAnimationProvider>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <AnimatedAppContainer>
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="queue" 
                  options={{ 
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                  }} 
                />
                <Stack.Screen 
                  name="playlist/[id]" 
                  options={{ 
                    headerShown: false,
                    animation: 'slide_from_right',
                  }} 
                />
                <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
              </Stack>
            </AnimatedAppContainer>
            <PersistentPlayer />
          </View>
        </PlayerAnimationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
