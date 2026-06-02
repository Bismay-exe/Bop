import React from 'react';
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../constants';

interface PillProps {
  icon?: React.ReactNode;
  label?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function Pill({ icon, label, onPress, style }: PillProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
  scale.value = withTiming(0.95, {
    duration: 120,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
};

const handlePressOut = () => {
  scale.value = withTiming(1, {
    duration: 180,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
};

  return (
    <Pressable 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      hitSlop={4}
    >
      <Animated.View style={[styles.pillButton, style, animatedStyle]}>
        {icon}
        {label && <Text style={styles.pillText}>{label}</Text>}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.textPrimary, // Dark pill background
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    gap: Spacing.sm,
  },
  pillText: {
    ...Typography.bodyMedium,
    color: Colors.background, // Light text
  },
});
