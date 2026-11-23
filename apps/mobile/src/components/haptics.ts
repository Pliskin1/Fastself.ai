import * as Haptics from 'expo-haptics';

function safe(run: () => Promise<void>): void {
  run().catch(() => undefined);
}

export const haptics = {
  selection: () => safe(() => Haptics.selectionAsync()),
  impactLight: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
