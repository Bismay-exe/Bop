import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';

export default function NotificationSettings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="System">
        <SettingRow icon="notifications-outline" title="Show Playback Controls" subtitle="Display controls in notification panel" type="toggle" value={true} />
        <SettingRow icon="albums-outline" title="Widget Visibility" subtitle="Show widget on lock screen" type="toggle" value={true} />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
