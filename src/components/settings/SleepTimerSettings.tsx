import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';

export default function SleepTimerSettings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Sleep Timer">
        <SettingRow icon="time-outline" title="Default Duration" value="30 min" type="value" />
        <SettingRow icon="volume-low-outline" title="Fade Out Before Stop" subtitle="Gradually decrease volume before stopping" type="toggle" value={true} />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
