import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';
import SettingPicker, { PickerOption } from './SettingPicker';
import { useSettingsStore } from '../../store/settingsStore';
import { Haptic } from '../../services/haptics';

const RESCAN_OPTIONS: PickerOption[] = [
  { label: 'On Startup', value: 'startup' },
  { label: 'Manual Only', value: 'manual' },
  { label: 'Daily', value: 'daily' },
];

const label = (options: PickerOption[], value: string) =>
  options.find((o) => o.value === value)?.label ?? '';

export default function AdvancedSettings() {
  const s = useSettingsStore();
  const [rescanOpen, setRescanOpen] = useState(false);

  const handleReset = () => {
    Alert.alert(
      'Reset All Settings',
      'Restore every setting to its default value? This does not affect your music, playlists, or favorites.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            s.reset();
            Haptic.success();
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="System">
        <SettingRow
          icon="sync-outline"
          title="Rescan Library Frequency"
          value={label(RESCAN_OPTIONS, s.rescanFrequency)}
          type="value"
          onPress={() => setRescanOpen(true)}
        />
        <SettingRow
          icon="battery-half-outline"
          title="Battery Optimization"
          subtitle="Manage background playback behavior"
          type="link"
          onPress={() => Linking.openSettings().catch(() => {})}
        />
      </SettingSection>

      <SettingSection title="Danger Zone">
        <SettingRow
          icon="warning-outline"
          title="Reset All Settings"
          subtitle="Restore default configuration"
          type="link"
          destructive
          onPress={handleReset}
        />
      </SettingSection>

      <SettingPicker
        visible={rescanOpen}
        title="Rescan Library Frequency"
        options={RESCAN_OPTIONS}
        selected={s.rescanFrequency}
        onSelect={(v) => s.set('rescanFrequency', v as typeof s.rescanFrequency)}
        onClose={() => setRescanOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
