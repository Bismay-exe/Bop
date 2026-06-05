import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';

export default function AdvancedSettings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="System">
        <SettingRow icon="sync-outline" title="Rescan Library Frequency" value="On Startup" type="value" />
        <SettingRow icon="battery-half-outline" title="Battery Optimization" subtitle="Manage background playback behavior" type="link" />
      </SettingSection>

      <SettingSection title="Danger Zone">
        <SettingRow icon="warning-outline" title="Reset All Settings" subtitle="Restore default configuration" type="link" />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
