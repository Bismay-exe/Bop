import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';

export default function StorageSettings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Downloads">
        <SettingRow icon="cloud-download-outline" title="Download Quality" value="320k" type="value" />
        <SettingRow icon="folder-outline" title="Download Location" value="Internal Storage" type="value" />
        <SettingRow icon="trash-bin-outline" title="Auto-delete Played" subtitle="Remove downloaded tracks after playing" type="toggle" value={false} />
      </SettingSection>

      <SettingSection title="Cache & Storage">
        <SettingRow icon="pie-chart-outline" title="Storage Usage" value="1.2 GB" type="value" />
        <SettingRow icon="trash-outline" title="Clear Cache" subtitle="Free up space by deleting temporary files" type="link" />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
