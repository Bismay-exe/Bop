import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';
import { useSettingsStore } from '../../store/settingsStore';
import { applyNotificationControls } from '../../services/TrackPlayerService';

export default function NotificationSettings() {
  const s = useSettingsStore();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="System">
        <SettingRow
          icon="notifications-outline"
          title="Show Playback Controls"
          subtitle="Display controls in notification panel"
          type="toggle"
          value={s.showPlaybackControls}
          onValueChange={(v) => {
            s.set('showPlaybackControls', v);
            applyNotificationControls(v);
          }}
        />
        <SettingRow
          icon="albums-outline"
          title="Widget Visibility"
          subtitle="Show widget on lock screen"
          type="toggle"
          badge="Coming soon"
          disabled
        />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
