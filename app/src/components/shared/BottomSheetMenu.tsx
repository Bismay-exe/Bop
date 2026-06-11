import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants';

export interface MenuAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

interface BottomSheetMenuProps {
  title?: string;
  subtitle?: string;
  actions: MenuAction[];
  onDismiss?: () => void;
}

export const BottomSheetMenu = forwardRef<BottomSheetModal, BottomSheetMenuProps>(
  ({ title, subtitle, actions, onDismiss }, ref) => {

    // Renders the semi-transparent backdrop behind the sheet
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['50%']} // Dynamic sizing could also be used: enableDynamicSizing={true}
        enableDynamicSizing={true}
        backdropComponent={renderBackdrop}
        onDismiss={onDismiss}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.indicator}
      >
        <BottomSheetView style={styles.contentContainer}>
          {(title || subtitle) && (
            <View style={styles.header}>
              {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
            </View>
          )}

          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionButton,
                  index < actions.length - 1 && styles.actionDivider,
                ]}
                onPress={() => {
                  // Wait for touch to register before dismissing, 
                  // but caller is responsible for dismissing the ref if desired.
                  action.onPress();
                }}
              >
                <Ionicons
                  name={action.icon}
                  size={24}
                  color={action.destructive ? Colors.error || 'red' : Colors.textPrimary}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    action.destructive && { color: Colors.error || 'red' },
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
  },
  indicator: {
    backgroundColor: Colors.divider,
    width: 40,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl * 2, // Extra padding for bottom inset
  },
  header: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  actionsContainer: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  actionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  actionLabel: {
    ...Typography.body,
    marginLeft: Spacing.md,
    color: Colors.textPrimary,
  },
});
