import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from '@/copy/sr';

/** The Android channel of every reminder. Android drops notifications scheduled before their channel exists. */
export const REMINDERS_CHANNEL = 'podsjetnici';

/**
 * Makes sure reminders may be shown, asking the user if the system still allows a prompt.
 * On Android the channel is created first: Android 13+ shows the permission prompt only once a channel exists.
 * Returns true when notifications are allowed.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL, {
        name: t('notif.channel'),
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const answer = await Notifications.requestPermissionsAsync();
    return answer.granted;
  } catch {
    return false;
  }
}
