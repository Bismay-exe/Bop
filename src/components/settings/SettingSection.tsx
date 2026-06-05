import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants';

interface SettingSectionProps {
  title?: string;
  children: React.ReactNode;
}

export default function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.card}>
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return null;
          return (
            <React.Fragment key={index}>
              {child}
              {index < React.Children.count(children) - 1 && <View style={styles.divider} />}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.title,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 13,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.md + 40 + Spacing.md, // Align with text starting after icon
  },
});
