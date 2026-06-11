import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';

export default function AccessibilitySettings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Visual">
        <SettingRow icon="text-outline" title="Larger Text Mode" subtitle="Increase font size across the app" type="toggle" value={false} />
        <SettingRow icon="contrast-outline" title="High Contrast Mode" subtitle="Increase contrast for better visibility" type="toggle" value={false} />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
