import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';

export default function AppearanceSettings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Theme & Colors">
        <SettingRow icon="color-palette-outline" title="Theme" value="System" type="value" />
        <SettingRow icon="brush-outline" title="Accent Color" value="Default" type="value" />
        <SettingRow icon="color-wand-outline" title="Dynamic Colors" subtitle="Extract gradient from artwork" type="toggle" value={true} />
      </SettingSection>

      <SettingSection title="Player">
        <SettingRow icon="image-outline" title="Album Art Display" value="Full Bleed" type="value" />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
