import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';
import SettingSection from './SettingSection';
import SettingRow from './SettingRow';

export default function AboutSettings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>Bop</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <SettingSection>
        <SettingRow icon="information-circle-outline" title="App Version" value="1.0.0" type="value" />
        <SettingRow icon="document-text-outline" title="Licenses" type="link" />
        <SettingRow icon="star-outline" title="Rate the App" type="link" />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
  header: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  appName: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
  },
  version: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
