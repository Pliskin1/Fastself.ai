import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from '@/copy/sr';

/** The Android channel of every reminder. Android drops notifications scheduled before their channel exists. */
export const REMINDERS_CHANNEL = 'podsjetnici';

/**
 * Creates the Android channel (docs/PLATFORMS.md §4); iOS has no channels. Creating a channel that exists changes
 * nothing, so every path that schedules calls this first instead of trusting that the app start already did.
 */
export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL, {
    name: t('notif.channel'),
    importance: Notifications.AndroidImportance.HIGH,
  });
}
