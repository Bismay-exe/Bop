import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants';
import { useLibraryStore } from '../../store/libraryStore';
import { useSettingsStore } from '../../store/settingsStore';
import { scanLocalMusic } from '../../services/MediaScannerService';
import * as MediaLibrary from 'expo-media-library/legacy';
import { EmptyState } from '../../components/shared/EmptyState';

// Home Components
import { HomeHeader } from '../../components/home/HomeHeader';
import { HeroCard } from '../../components/home/HeroCard';
import { QuickActions } from '../../components/home/QuickActions';
import { RecentlyPlayedSection } from '../../components/home/RecentlyPlayedSection';
import { AlbumsSection } from '../../components/home/AlbumsSection';
import { ArtistsSection } from '../../components/home/ArtistsSection';
import { OnRepeatSection } from '../../components/home/OnRepeatSection';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const songs = useLibraryStore((s) => s.songs);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const isRefreshing = useLibraryStore((s) => s.isRefreshing);
  const { setSongs, setRefreshing, finalizeScan, setScanning } = useLibraryStore();

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const scannedSongs = await scanLocalMusic(() => {});
      setSongs(scannedSongs);
      finalizeScan();
    } catch (err) {
      console.error(err);
      setRefreshing(false);
    }
  }, [setRefreshing, setSongs, finalizeScan]);

  // Automatic background scan on mount if permissions were already granted
  useEffect(() => {
    let mounted = true;

    // Honor the user's "Rescan Library Frequency" setting.
    const frequency = useSettingsStore.getState().rescanFrequency;
    if (frequency === 'manual') {
      return () => { mounted = false; };
    }
    if (frequency === 'daily') {
      const last = useLibraryStore.getState().lastScanned ?? 0;
      const dayMs = 24 * 60 * 60 * 1000;
      if (Date.now() - last < dayMs) {
        return () => { mounted = false; };
      }
    }

    const runBackgroundScan = async () => {
      try {
        const { status } = await MediaLibrary.getPermissionsAsync();
        if (status === 'granted' && mounted) {
          setScanning(true);
          const scannedSongs = await scanLocalMusic(() => {});
          if (mounted) {
            setSongs(scannedSongs);
            finalizeScan();
          }
        }
      } catch (err) {
        console.error('Background scan failed:', err);
        if (mounted) {
          setScanning(false);
        }
      }
    };
    
    runBackgroundScan();
    
    return () => { mounted = false; };
  }, [setSongs, finalizeScan, setScanning]);



  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingTop: Math.max(insets.top, Spacing.md),
          paddingBottom: Math.max(insets.bottom, Spacing.xxl * 2),
          flexGrow: 1
        }}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh} 
            tintColor={Colors.primary} 
          />
        }
      >
        <HomeHeader />
        
        {isScanning && !isRefreshing ? (
          <EmptyState permissionStatus="granted" />
        ) : songs.length === 0 && !isRefreshing ? (
          <EmptyState 
            permissionStatus="granted" 
            onRescan={handleRefresh}
            subtitleOverride="Tap below or pull to refresh to scan for local music."
          />
        ) : (
          <>
            <HeroCard />
            <QuickActions />
            <RecentlyPlayedSection />
            <OnRepeatSection />
            <AlbumsSection />
            <ArtistsSection />
          </>
        )}
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
