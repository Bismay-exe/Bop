import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';
import SettingPicker, { PickerOption } from './SettingPicker';
import { useSettingsStore } from '../../store/settingsStore';

const FONT_SIZE_OPTIONS: PickerOption[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

const BLUR_OPTIONS: PickerOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const BACKGROUND_OPTIONS: PickerOption[] = [
  { label: 'Gradient Focus', value: 'gradient' },
  { label: 'Solid', value: 'solid' },
  { label: 'Artwork', value: 'artwork' },
];

const label = (options: PickerOption[], value: string) =>
  options.find((o) => o.value === value)?.label ?? '';

type OpenPicker = 'fontSize' | 'blur' | 'background' | null;

export default function LyricsSettings() {
  const s = useSettingsStore();
  const [picker, setPicker] = useState<OpenPicker>(null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Playback">
        <SettingRow
          icon="mic-outline"
          title="Synced Lyrics"
          subtitle="Show time-synced lyrics if available"
          type="toggle"
          value={s.syncedLyrics}
          onValueChange={(v) => s.set('syncedLyrics', v)}
        />
        <SettingRow
          icon="arrow-down-outline"
          title="Auto-scroll Lyrics"
          type="toggle"
          value={s.autoScrollLyrics}
          onValueChange={(v) => s.set('autoScrollLyrics', v)}
        />
      </SettingSection>

      <SettingSection title="Appearance">
        <SettingRow
          icon="text-outline"
          title="Lyrics Font Size"
          value={label(FONT_SIZE_OPTIONS, s.lyricsFontSize)}
          type="value"
          onPress={() => setPicker('fontSize')}
        />
        <SettingRow
          icon="contrast-outline"
          title="Blur Intensity"
          value={label(BLUR_OPTIONS, s.lyricsBlurIntensity)}
          type="value"
          onPress={() => setPicker('blur')}
        />
        <SettingRow
          icon="color-fill-outline"
          title="Background Style"
          value={label(BACKGROUND_OPTIONS, s.lyricsBackground)}
          type="value"
          onPress={() => setPicker('background')}
        />
      </SettingSection>

      <SettingPicker
        visible={picker === 'fontSize'}
        title="Lyrics Font Size"
        options={FONT_SIZE_OPTIONS}
        selected={s.lyricsFontSize}
        onSelect={(v) => s.set('lyricsFontSize', v as typeof s.lyricsFontSize)}
        onClose={() => setPicker(null)}
      />
      <SettingPicker
        visible={picker === 'blur'}
        title="Blur Intensity"
        options={BLUR_OPTIONS}
        selected={s.lyricsBlurIntensity}
        onSelect={(v) => s.set('lyricsBlurIntensity', v as typeof s.lyricsBlurIntensity)}
        onClose={() => setPicker(null)}
      />
      <SettingPicker
        visible={picker === 'background'}
        title="Background Style"
        options={BACKGROUND_OPTIONS}
        selected={s.lyricsBackground}
        onSelect={(v) => s.set('lyricsBackground', v as typeof s.lyricsBackground)}
        onClose={() => setPicker(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
