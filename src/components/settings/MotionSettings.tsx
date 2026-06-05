import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';

export default function MotionSettings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Animations & Blur">
        <SettingRow icon="accessibility-outline" title="Reduce Motion" subtitle="Disables blur, transitions & overlays" type="toggle" value={false} />
        <SettingRow icon="water-outline" title="Haptic Feedback" type="toggle" value={true} />
      </SettingSection>

      <SettingSection title="Gestures">
        <SettingRow icon="hand-left-outline" title="Gesture Sensitivity" value="Medium" type="value" />
        <SettingRow icon="albums-outline" title="Mini-Player Style" value="Floating" type="value" />
        <SettingRow icon="swap-vertical-outline" title="Swipe-to-dismiss Behavior" value="Collapse" type="value" />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
