import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore } from '../../store/libraryStore';

interface EmptyStateProps {
  permissionStatus: 'granted' | 'denied' | 'blocked' | 'unknown';
  onGrantPermission?: () => void;
  onOpenSettings?: () => void;
  onRescan?: () => void;
  // Overrides for specific scenarios (like empty playlist)
  iconOverride?: keyof typeof Ionicons.glyphMap;
  titleOverride?: string;
  subtitleOverride?: string;
  actionOverride?: { label: string; onPress: () => void };
}

export function EmptyState({
  permissionStatus,
  onGrantPermission,
  onOpenSettings,
  onRescan,
  iconOverride,
  titleOverride,
  subtitleOverride,
  actionOverride,
}: EmptyStateProps) {
  const isScanning = useLibraryStore((s) => s.isScanning);
  const scanProgress = useLibraryStore((s) => s.scanProgress);

  // 1. Scanning Precedence
  if (isScanning) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.textPrimary} />
        <Text style={styles.title}>Scanning Library...</Text>
        <Text style={styles.subtitle}>
          {scanProgress > 0 && scanProgress < 1 
            ? `Processed ${Math.round(scanProgress * 100)}%` 
            : 'Looking for local music'}
        </Text>
      </View>
    );
  }

  // 2. Permission Precedence
  if (permissionStatus === 'denied') {
    return (
      <View style={styles.container}>
        <Ionicons name="folder-open-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.title}>Access Needed</Text>
        <Text style={styles.subtitle}>We need permission to read your local music files.</Text>
        {onGrantPermission && (
          <TouchableOpacity style={styles.button} onPress={onGrantPermission}>
            <Text style={styles.buttonText}>Grant Access</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (permissionStatus === 'blocked') {
    return (
      <View style={styles.container}>
        <Ionicons name="settings-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.title}>Access Blocked</Text>
        <Text style={styles.subtitle}>Please enable storage permissions in your device settings.</Text>
        {onOpenSettings && (
          <TouchableOpacity style={styles.button} onPress={onOpenSettings}>
            <Text style={styles.buttonText}>Open Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 3. Fallback (Empty Library / Empty Playlist)
  return (
    <View style={styles.container}>
      <Ionicons name={iconOverride || "musical-notes-outline"} size={64} color={Colors.textSecondary} />
      <Text style={styles.title}>{titleOverride || "No Music Found"}</Text>
      {subtitleOverride && <Text style={styles.subtitle}>{subtitleOverride}</Text>}
      
      {actionOverride ? (
        <TouchableOpacity style={styles.button} onPress={actionOverride.onPress}>
          <Text style={styles.buttonText}>{actionOverride.label}</Text>
        </TouchableOpacity>
      ) : onRescan ? (
        <TouchableOpacity style={styles.button} onPress={onRescan}>
          <Text style={styles.buttonText}>Scan for Music</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  buttonText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
});
