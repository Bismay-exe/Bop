import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';
import { clearMediaCaches, formatBytes, getCacheSizeBytes } from '../../services/storageMaintenance';
import { Haptic } from '../../services/haptics';

export default function StorageSettings() {
  const [usage, setUsage] = useState<string>('—');

  const refreshUsage = () => setUsage(formatBytes(getCacheSizeBytes()));

  useEffect(() => {
    refreshUsage();
  }, []);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Delete cached artwork and lyrics? They will be regenerated automatically as you browse and play.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearMediaCaches();
            Haptic.success();
            refreshUsage();
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Download settings are placeholders: bop is an offline local player and does not download. */}
      <SettingSection title="Downloads">
        <SettingRow icon="cloud-download-outline" title="Download Quality" value="320k" type="value" />
        <SettingRow icon="folder-outline" title="Download Location" value="Internal Storage" type="value" />
        <SettingRow icon="trash-bin-outline" title="Auto-delete Played" subtitle="Remove downloaded tracks after playing" type="toggle" value={false} />
      </SettingSection>

      <SettingSection title="Cache & Storage">
        <SettingRow icon="pie-chart-outline" title="Storage Usage" value={usage} type="value" disabled />
        <SettingRow
          icon="trash-outline"
          title="Clear Cache"
          subtitle="Free up space by deleting temporary files"
          type="link"
          onPress={handleClearCache}
        />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
