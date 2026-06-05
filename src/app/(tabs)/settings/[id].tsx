import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppearanceSettings from '../../../components/settings/AppearanceSettings';
import MotionSettings from '../../../components/settings/MotionSettings';
import LyricsSettings from '../../../components/settings/LyricsSettings';
import PlaybackSettings from '../../../components/settings/PlaybackSettings';
import StorageSettings from '../../../components/settings/StorageSettings';
import LibrarySettings from '../../../components/settings/LibrarySettings';
import NotificationSettings from '../../../components/settings/NotificationSettings';
import SleepTimerSettings from '../../../components/settings/SleepTimerSettings';
import AccessibilitySettings from '../../../components/settings/AccessibilitySettings';
import AdvancedSettings from '../../../components/settings/AdvancedSettings';
import AboutSettings from '../../../components/settings/AboutSettings';

const SETTINGS_COMPONENTS: Record<string, { title: string; Component: React.FC }> = {
  appearance: { title: 'Appearance', Component: AppearanceSettings },
  motion: { title: 'Motion & Gestures', Component: MotionSettings },
  lyrics: { title: 'Lyrics', Component: LyricsSettings },
  playback: { title: 'Playback', Component: PlaybackSettings },
  storage: { title: 'Downloads & Storage', Component: StorageSettings },
  library: { title: 'Library', Component: LibrarySettings },
  notifications: { title: 'Notifications', Component: NotificationSettings },
  sleeptimer: { title: 'Sleep Timer', Component: SleepTimerSettings },
  accessibility: { title: 'Accessibility', Component: AccessibilitySettings },
  advanced: { title: 'Advanced', Component: AdvancedSettings },
  about: { title: 'About', Component: AboutSettings },
};

export default function SubSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const setting = SETTINGS_COMPONENTS[id || ''];

  if (!setting) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Settings page not found</Text>
      </View>
    );
  }

  const { title, Component } = setting;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.backButton} />
      </View>
      <Component />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});
