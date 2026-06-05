import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';

export default function PlaybackSettings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Audio Transitions">
        <SettingRow icon="git-compare-outline" title="Crossfade Duration" value="3s" type="value" />
        <SettingRow icon="play-forward-outline" title="Gapless Playback" type="toggle" value={true} />
        <SettingRow icon="cut-outline" title="Skip Silence" subtitle="Automatically skip long silent sections" type="toggle" value={false} />
      </SettingSection>

      <SettingSection title="Audio Quality">
        <SettingRow icon="options-outline" title="Equalizer / Presets" value="Acoustic" type="value" />
        <SettingRow icon="volume-high-outline" title="Volume Normalize" subtitle="Balance loudness between tracks" type="toggle" value={true} />
        <SettingRow icon="speedometer-outline" title="Playback Speed" value="1.0x" type="value" />
      </SettingSection>

      <SettingSection title="Behavior">
        <SettingRow icon="headset-outline" title="Resume on Headphones" subtitle="Resume playback on reconnect" type="toggle" value={true} />
        <SettingRow icon="bluetooth-outline" title="Auto-play on Bluetooth" type="toggle" value={false} />
        <SettingRow icon="sync-outline" title="Remember Queue" subtitle="Restore queue on app restart" type="toggle" value={true} />
        <SettingRow icon="time-outline" title="Resume Last Session" subtitle="Auto-load last played track on launch" type="toggle" value={true} />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
