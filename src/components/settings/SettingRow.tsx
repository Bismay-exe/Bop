import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../constants';

interface SettingRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  type?: 'link' | 'toggle' | 'value';
  value?: string | boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
}

export default function SettingRow({
  icon,
  title,
  subtitle,
  type = 'link',
  value,
  onPress,
  onValueChange,
  disabled = false,
}: SettingRowProps) {
  const content = (
    <>
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={disabled ? Colors.textSecondary : Colors.textPrimary} />
        </View>
      )}
      <View style={styles.textContainer}>
        <Text style={[styles.title, disabled && styles.disabledText]}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.actionContainer}>
        {type === 'link' && (
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        )}
        {type === 'value' && (
          <View style={styles.valueRow}>
            <Text style={styles.valueText}>{value}</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </View>
        )}
        {type === 'toggle' && (
          <Switch
            value={!!value}
            onValueChange={onValueChange}
            disabled={disabled}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.primary }}
            thumbColor={'#FFFFFF'}
          />
        )}
      </View>
    </>
  );

  if (type === 'toggle' || !onPress) {
    return <View style={[styles.container, disabled && styles.disabledContainer]}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabledContainer]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  disabledText: {
    color: Colors.textSecondary,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionContainer: {
    marginLeft: Spacing.md,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
});
