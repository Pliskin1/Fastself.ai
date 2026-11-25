import * as Notifications from 'expo-notifications';
import { ensureChannel } from './channels';

export { REMINDERS_CHANNEL } from './channels';

/**
 * Makes sure reminders may be shown, asking the user if the system still allows a prompt.
 * On Android the channel is created first: Android 13+ shows the permission prompt only once a channel exists.
 * Returns true when notifications are allowed.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const answer = await Notifications.requestPermissionsAsync();
    return answer.granted;
  } catch {
    return false;
  }
}
