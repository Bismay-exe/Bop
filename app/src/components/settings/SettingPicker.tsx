import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Typography } from '../../constants';

export interface PickerOption {
  label: string;
  value: string | number;
}

interface SettingPickerProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: string | number;
  onSelect: (value: string | number) => void;
  onClose: () => void;
}

export default function SettingPicker({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: SettingPickerProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <View style={styles.options}>
            {options.map((opt, index) => {
              const isSelected = opt.value === selected;
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[styles.option, index < options.length - 1 && styles.optionDivider]}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={22} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.divider,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  options: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  optionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  optionLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  optionLabelSelected: {
    color: Colors.primary,
    fontFamily: 'Semibold',
  },
});
