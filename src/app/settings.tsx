import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants';
import { scanLocalMusic } from '../services/MediaScannerService';
import { useLibraryStore } from '../store/libraryStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { setScanning, setSongs, isScanning, setScanProgress } = useLibraryStore();

  const handleScan = async () => {
    if (isScanning) return;
    try {
      setScanning(true);
      const scannedSongs = await scanLocalMusic((loaded, total) => {
        setScanProgress(total > 0 ? loaded / total : 0);
      });
      setSongs(scannedSongs);
      // Wait for store to finalize before navigating back
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }, 500);
    } catch (err: any) {
      Alert.alert('Scan Failed', err.message || 'Could not complete scanning.');
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Library & Storage</Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={handleScan}
            disabled={isScanning}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="scan-outline" size={24} color={Colors.textPrimary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Scan Device</Text>
              <Text style={styles.rowSubtitle}>Find new music on your device</Text>
            </View>
            {isScanning && <Ionicons name="sync-outline" size={20} color={Colors.textSecondary} />}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={handleScan}
            disabled={isScanning}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="refresh-outline" size={24} color={Colors.textPrimary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Rescan Library</Text>
              <Text style={styles.rowSubtitle}>Rebuild the library index</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl + Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.title,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.md + 40 + Spacing.md, // Align with text
  },
});
