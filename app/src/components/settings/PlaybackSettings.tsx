import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';
import SettingPicker, { PickerOption } from './SettingPicker';
import { useSettingsStore } from '../../store/settingsStore';
import { setPlaybackRate } from '../../services/TrackPlayerService';

const SPEED_OPTIONS: PickerOption[] = [
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1.0x (Normal)', value: 1.0 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '2.0x', value: 2.0 },
];

export default function PlaybackSettings() {
  const s = useSettingsStore();
  const [speedOpen, setSpeedOpen] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Audio Transitions">
        <SettingRow icon="git-compare-outline" title="Crossfade Duration" type="value" badge="Coming soon" disabled />
        <SettingRow
          icon="play-forward-outline"
          title="Gapless Playback"
          type="toggle"
          value={s.gaplessPlayback}
          onValueChange={(v) => s.set('gaplessPlayback', v)}
        />
        <SettingRow icon="cut-outline" title="Skip Silence" subtitle="Automatically skip long silent sections" type="toggle" badge="Coming soon" disabled />
      </SettingSection>

      <SettingSection title="Audio Quality">
        <SettingRow icon="options-outline" title="Equalizer / Presets" type="value" badge="Coming soon" disabled />
        <SettingRow icon="volume-high-outline" title="Volume Normalize" subtitle="Balance loudness between tracks" type="toggle" badge="Coming soon" disabled />
        <SettingRow
          icon="speedometer-outline"
          title="Playback Speed"
          value={`${s.playbackSpeed.toFixed(2).replace(/0$/, '')}x`}
          type="value"
          onPress={() => setSpeedOpen(true)}
        />
      </SettingSection>

      <SettingSection title="Behavior">
        <SettingRow
          icon="headset-outline"
          title="Resume on Headphones"
          subtitle="Resume playback on reconnect"
          type="toggle"
          value={s.resumeOnHeadphones}
          onValueChange={(v) => s.set('resumeOnHeadphones', v)}
        />
        <SettingRow
          icon="bluetooth-outline"
          title="Auto-play on Bluetooth"
          type="toggle"
          value={s.autoplayBluetooth}
          onValueChange={(v) => s.set('autoplayBluetooth', v)}
        />
        <SettingRow
          icon="sync-outline"
          title="Remember Queue"
          subtitle="Restore queue on app restart"
          type="toggle"
          value={s.rememberQueue}
          onValueChange={(v) => s.set('rememberQueue', v)}
        />
        <SettingRow
          icon="time-outline"
          title="Resume Last Session"
          subtitle="Auto-load last played track on launch"
          type="toggle"
          value={s.resumeLastSession}
          onValueChange={(v) => s.set('resumeLastSession', v)}
        />
      </SettingSection>

      <SettingPicker
        visible={speedOpen}
        title="Playback Speed"
        options={SPEED_OPTIONS}
        selected={s.playbackSpeed}
        onSelect={(v) => {
          s.set('playbackSpeed', v as number);
          setPlaybackRate(v as number);
        }}
        onClose={() => setSpeedOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
