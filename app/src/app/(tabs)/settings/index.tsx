import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AccountSection from '../../../components/settings/AccountSection';
import SettingRow from '../../../components/settings/SettingRow';
import SettingSection from '../../../components/settings/SettingSection';
import { Colors, Spacing, Typography } from '../../../constants';

export default function SettingsIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 24) }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AccountSection />

        <SettingSection title="General">
          <SettingRow
            icon="color-palette-outline"
            title="Appearance"
            subtitle="Theme, dynamic colors, artwork style"
            onPress={() => router.push('/settings/appearance')}
          />
          <SettingRow
            icon="accessibility-outline"
            title="Motion & Gestures"
            subtitle="Animations, haptics, gesture behavior"
            onPress={() => router.push('/settings/motion')}
          />
        </SettingSection>

        <SettingSection title="Audio & Playback">
          <SettingRow
            icon="musical-notes-outline"
            title="Playback"
            subtitle="Crossfade, gapless, equalizer, behavior"
            onPress={() => router.push('/settings/playback')}
          />
          <SettingRow
            icon="mic-outline"
            title="Lyrics"
            subtitle="Sync, auto-scroll, display style"
            onPress={() => router.push('/settings/lyrics')}
          />
          <SettingRow
            icon="time-outline"
            title="Sleep Timer"
            subtitle="Auto-stop playback after duration"
            onPress={() => router.push('/settings/sleeptimer')}
          />
        </SettingSection>

        <SettingSection title="Data & Storage">
          <SettingRow
            icon="library-outline"
            title="Library"
            subtitle="Scan folders, sort defaults"
            onPress={() => router.push('/settings/library')}
          />
          <SettingRow
            icon="cloud-download-outline"
            title="Downloads & Storage"
            subtitle="Quality, location, cache"
            onPress={() => router.push('/settings/storage')}
          />
        </SettingSection>

        <SettingSection title="App Preferences">
          <SettingRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="System controls, widget"
            onPress={() => router.push('/settings/notifications')}
          />
          <SettingRow
            icon="eye-outline"
            title="Accessibility"
            subtitle="Text size, contrast"
            onPress={() => router.push('/settings/accessibility')}
          />
          <SettingRow
            icon="options-outline"
            title="Advanced"
            subtitle="Battery, resets, diagnostics"
            onPress={() => router.push('/settings/advanced')}
          />
        </SettingSection>

        <SettingSection title="About">
          <SettingRow
            icon="information-circle-outline"
            title="About Bop"
            subtitle="Version, licenses"
            onPress={() => router.push('/settings/about')}
          />
        </SettingSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl * 2, // Space for bottom nav player
  },
});
