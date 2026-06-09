import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';
import SettingPicker, { PickerOption } from './SettingPicker';
import { useSettingsStore } from '../../store/settingsStore';
import { Haptic } from '../../services/haptics';

const SENSITIVITY_OPTIONS: PickerOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const MINI_PLAYER_OPTIONS: PickerOption[] = [
  { label: 'Floating', value: 'floating' },
  { label: 'Docked', value: 'docked' },
];

const SWIPE_OPTIONS: PickerOption[] = [
  { label: 'Collapse', value: 'collapse' },
  { label: 'Dismiss', value: 'dismiss' },
];

const label = (options: PickerOption[], value: string) =>
  options.find((o) => o.value === value)?.label ?? '';

type OpenPicker = 'sensitivity' | 'miniPlayer' | 'swipe' | null;

export default function MotionSettings() {
  const s = useSettingsStore();
  const [picker, setPicker] = useState<OpenPicker>(null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Animations & Blur">
        <SettingRow
          icon="accessibility-outline"
          title="Reduce Motion"
          subtitle="Disables blur, transitions & overlays"
          type="toggle"
          value={s.reduceMotion}
          onValueChange={(v) => s.set('reduceMotion', v)}
        />
        <SettingRow
          icon="water-outline"
          title="Haptic Feedback"
          type="toggle"
          value={s.hapticsEnabled}
          onValueChange={(v) => {
            s.set('hapticsEnabled', v);
            if (v) Haptic.selection();
          }}
        />
      </SettingSection>

      <SettingSection title="Gestures">
        <SettingRow
          icon="hand-left-outline"
          title="Gesture Sensitivity"
          value={label(SENSITIVITY_OPTIONS, s.gestureSensitivity)}
          type="value"
          onPress={() => setPicker('sensitivity')}
        />
        <SettingRow
          icon="albums-outline"
          title="Mini-Player Style"
          value={label(MINI_PLAYER_OPTIONS, s.miniPlayerStyle)}
          type="value"
          onPress={() => setPicker('miniPlayer')}
        />
        <SettingRow
          icon="swap-vertical-outline"
          title="Swipe-to-dismiss Behavior"
          value={label(SWIPE_OPTIONS, s.swipeBehavior)}
          type="value"
          onPress={() => setPicker('swipe')}
        />
      </SettingSection>

      <SettingPicker
        visible={picker === 'sensitivity'}
        title="Gesture Sensitivity"
        options={SENSITIVITY_OPTIONS}
        selected={s.gestureSensitivity}
        onSelect={(v) => s.set('gestureSensitivity', v as typeof s.gestureSensitivity)}
        onClose={() => setPicker(null)}
      />
      <SettingPicker
        visible={picker === 'miniPlayer'}
        title="Mini-Player Style"
        options={MINI_PLAYER_OPTIONS}
        selected={s.miniPlayerStyle}
        onSelect={(v) => s.set('miniPlayerStyle', v as typeof s.miniPlayerStyle)}
        onClose={() => setPicker(null)}
      />
      <SettingPicker
        visible={picker === 'swipe'}
        title="Swipe-to-dismiss Behavior"
        options={SWIPE_OPTIONS}
        selected={s.swipeBehavior}
        onSelect={(v) => s.set('swipeBehavior', v as typeof s.swipeBehavior)}
        onClose={() => setPicker(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
