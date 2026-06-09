import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';
import SettingPicker, { PickerOption } from './SettingPicker';
import { useSettingsStore } from '../../store/settingsStore';
import { useSleepTimer } from '../../services/sleepTimer';
import { Haptic } from '../../services/haptics';

const DURATION_OPTIONS: PickerOption[] = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
];

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function SleepTimerSettings() {
  const s = useSettingsStore();
  const timer = useSleepTimer();
  const [durationOpen, setDurationOpen] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Sleep Timer">
        <SettingRow
          icon="time-outline"
          title="Default Duration"
          value={`${s.sleepDefaultMinutes} min`}
          type="value"
          onPress={() => setDurationOpen(true)}
        />
        <SettingRow
          icon="volume-low-outline"
          title="Fade Out Before Stop"
          subtitle="Gradually decrease volume before stopping"
          type="toggle"
          value={s.sleepFadeOut}
          onValueChange={(v) => s.set('sleepFadeOut', v)}
        />
      </SettingSection>

      <SettingSection title={timer.active ? 'Active' : 'Control'}>
        {timer.active ? (
          <SettingRow
            icon="stop-circle-outline"
            title="Stop Timer"
            subtitle={`Pausing in ${formatRemaining(timer.remainingMs)}`}
            type="link"
            destructive
            onPress={() => {
              timer.cancel();
              Haptic.medium();
            }}
          />
        ) : (
          <SettingRow
            icon="play-circle-outline"
            title="Start Timer"
            subtitle={`Pause playback after ${s.sleepDefaultMinutes} min`}
            type="link"
            onPress={() => {
              timer.start(s.sleepDefaultMinutes);
              Haptic.success();
            }}
          />
        )}
      </SettingSection>

      <SettingPicker
        visible={durationOpen}
        title="Default Duration"
        options={DURATION_OPTIONS}
        selected={s.sleepDefaultMinutes}
        onSelect={(v) => s.set('sleepDefaultMinutes', v as number)}
        onClose={() => setDurationOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
