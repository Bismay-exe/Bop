import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';

export default function LibrarySettings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Local Files">
        <SettingRow icon="search-outline" title="Scan Folders for Music" subtitle="Find new audio files on your device" type="link" />
        <SettingRow icon="close-circle-outline" title="Ignored Folders" subtitle="Manage folders to exclude from library" type="link" />
      </SettingSection>

      <SettingSection title="Organization">
        <SettingRow icon="filter-outline" title="Sort Order Defaults" value="Artist" type="value" />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
