import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Centralized haptic feedback, gated by the user's "Haptic Feedback" setting.
 * Fire-and-forget: never throws into the caller.
 */
function enabled(): boolean {
  return useSettingsStore.getState().hapticsEnabled;
}

export const Haptic = {
  light: () => {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium: () => {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  heavy: () => {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  selection: () => {
    if (enabled()) Haptics.selectionAsync().catch(() => {});
  },
  success: () => {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
