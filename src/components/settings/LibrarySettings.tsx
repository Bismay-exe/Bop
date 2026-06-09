import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';
import SettingPicker, { PickerOption } from './SettingPicker';
import { useSettingsStore } from '../../store/settingsStore';
import { useLibraryStore } from '../../store/libraryStore';
import { scanLocalMusic } from '../../services/MediaScannerService';

const SORT_OPTIONS: PickerOption[] = [
  { label: 'Artist', value: 'artist' },
  { label: 'Title', value: 'title' },
  { label: 'Album', value: 'album' },
  { label: 'Date Added', value: 'dateAdded' },
];

const label = (options: PickerOption[], value: string) =>
  options.find((o) => o.value === value)?.label ?? '';

export default function LibrarySettings() {
  const s = useSettingsStore();
  const [sortOpen, setSortOpen] = useState(false);

  const songs = useLibraryStore((st) => st.songs);
  const isScanning = useLibraryStore((st) => st.isScanning);
  const { setScanning, setSongs, setScanProgress, finalizeScan } = useLibraryStore();

  // Unfiltered folder list so the user can re-include previously ignored folders.
  const allFolders = useMemo(() => {
    const set = new Set<string>();
    for (const song of songs) set.add(song.folder || 'Unknown Folder');
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [songs]);

  const handleScan = async () => {
    if (isScanning) return;
    try {
      setScanning(true);
      const scanned = await scanLocalMusic((loaded, total) => {
        setScanProgress(total > 0 ? loaded / total : 0);
      });
      setSongs(scanned);
      finalizeScan();
    } catch (e) {
      console.error('[LibrarySettings] scan failed', e);
    } finally {
      setScanning(false);
    }
  };

  const toggleIgnored = (folder: string, ignored: boolean) => {
    const current = useSettingsStore.getState().ignoredFolders;
    const next = ignored
      ? [...current, folder]
      : current.filter((f) => f !== folder);
    s.set('ignoredFolders', next);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SettingSection title="Local Files">
        <SettingRow
          icon="search-outline"
          title="Scan Folders for Music"
          subtitle={isScanning ? 'Scanning…' : 'Find new audio files on your device'}
          type="link"
          disabled={isScanning}
          onPress={handleScan}
        />
      </SettingSection>

      <SettingSection title="Organization">
        <SettingRow
          icon="filter-outline"
          title="Sort Order Defaults"
          value={label(SORT_OPTIONS, s.sortOrder)}
          type="value"
          onPress={() => setSortOpen(true)}
        />
      </SettingSection>

      {allFolders.length > 0 && (
        <SettingSection title="Ignored Folders">
          {allFolders.map((folder) => {
            const isIgnored = s.ignoredFolders.includes(folder);
            return (
              <SettingRow
                key={folder}
                icon={isIgnored ? 'eye-off-outline' : 'folder-outline'}
                title={folder.split('/').pop() || folder}
                subtitle={isIgnored ? 'Excluded from library' : undefined}
                type="toggle"
                value={isIgnored}
                onValueChange={(v) => toggleIgnored(folder, v)}
              />
            );
          })}
        </SettingSection>
      )}

      <SettingPicker
        visible={sortOpen}
        title="Sort Order Defaults"
        options={SORT_OPTIONS}
        selected={s.sortOrder}
        onSelect={(v) => s.set('sortOrder', v as typeof s.sortOrder)}
        onClose={() => setSortOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
});
