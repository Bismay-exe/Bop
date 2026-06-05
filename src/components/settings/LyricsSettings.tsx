import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';

export default function LyricsSettings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Playback">
        <SettingRow icon="mic-outline" title="Synced Lyrics" subtitle="Show time-synced lyrics if available" type="toggle" value={true} />
        <SettingRow icon="arrow-down-outline" title="Auto-scroll Lyrics" type="toggle" value={true} />
      </SettingSection>

      <SettingSection title="Appearance">
        <SettingRow icon="text-outline" title="Lyrics Font Size" value="Large" type="value" />
        <SettingRow icon="contrast-outline" title="Blur Intensity" value="Medium" type="value" />
        <SettingRow icon="color-fill-outline" title="Background Style" value="Gradient Focus" type="value" />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
