import { ifEndParams, localFromEpoch, planNotifications } from '@fastself/core';
import type { PlannedNotification, ReminderKind } from '@fastself/core';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { t } from '@/copy/sr';
import { fastingSessions } from '@/db/repo';
import { nowMs, subscribeClock } from '@/lib/clock';
import { getSettings, settingsStore } from '@/store/settings';
import { REMINDERS_CHANNEL, ensureChannel } from './channels';
import { ensureNotificationPermission } from './permissions';

// Local reminders (docs/DATABASE.md §5). Core decides what fires and when (`planNotifications`); this module turns
// that into text from the copy files and hands it to the system. Nothing here ever shows a permission prompt,
// except the dev-only test notification.

/** Every planner notification has an id with this prefix, so a reschedule can replace exactly those. */
const PLAN_PREFIX = 'plan:';
const IF_END_ID = 'if:end';
const TEST_ID = 'test';
const HOUR_MS = 3600e3;

const COPY_KEY: Readonly<Record<ReminderKind, string>> = {
  eve: 'notif.eve',
  nafila: 'notif.nafila',
  sehur: 'notif.sehur',
  iftar: 'notif.iftar',
  windowOpen: 'notif.window.open',
  windowClose: 'notif.window.close',
};

/** One pending notification, as the dev screen lists it. `at` is app-clock epoch ms; null if we did not schedule it. */
export interface ScheduledItem {
  id: string;
  at: number | null;
  title: string;
  body: string;
}

/** How far the app clock is ahead of the real one. Zero unless the dev clock is set. */
const clockSkewMs = (): number => nowMs() - Date.now();

async function allowed(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** `atMs` is on the app clock. The system fires on real time, so the dev clock offset is taken out here. */
async function schedule(id: string, atMs: number, title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    // The fire time is kept in `data` because the trigger read back from the system differs per platform.
    content: { title, body, sound: true, data: { at: atMs } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(atMs - clockSkewMs()),
      channelId: REMINDERS_CHANNEL,
    },
  });
}

function textOf(planned: PlannedNotification): { title: string; body: string } {
  const key = COPY_KEY[planned.kind];
  return { title: t(`${key}.title`, planned.params), body: t(`${key}.body`, planned.params) };
}

/**
 * Schedules the "fast is over" notification of the IF timer for `endsAtMs` (app-clock epoch ms), replacing the
 * previous one. Does nothing when the switch "Kraj IF posta" is off, notifications are not allowed or the time
 * has passed. Never rejects: a reminder that cannot be scheduled must not break the timer.
 */
export async function scheduleIfEnd(endsAtMs: number): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(IF_END_ID);
    const settings = getSettings();
    if (!settings.reminders.ifEnd || endsAtMs <= nowMs() || !(await allowed())) return;
    await ensureChannel();
    const hours = fastingSessions.current()?.targetHours ?? settings.ifPlan;
    await schedule(IF_END_ID, endsAtMs, t('notif.if.end.title'), t('notif.if.end.body', ifEndParams(endsAtMs, hours)));
  } catch {
    // Nothing to do: the fast itself is stored, only its reminder is missing.
  }
}

/** Cancels the "fast is over" notification. Never rejects. */
export async function cancelIfEnd(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(IF_END_ID);
  } catch {
    // Nothing pending or the system call failed: either way there is nothing to cancel.
  }
}

async function replan(): Promise<void> {
  await ensureChannel();
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const { identifier } of pending) {
    if (identifier.startsWith(PLAN_PREFIX)) await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  if (await allowed()) {
    const settings = getSettings();
    const now = nowMs();
    for (const planned of planNotifications(localFromEpoch(now).n, settings, now, settings.reminders)) {
      const { title, body } = textOf(planned);
      await schedule(planned.id, planned.at, title, body);
    }
  }

  // The running fast is the source of truth for its reminder, so a switch turned off mid-fast takes effect.
  const fast = fastingSessions.current();
  if (fast) await scheduleIfEnd(fast.startedAt + fast.targetHours * HOUR_MS);
  else await cancelIfEnd();
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Replaces every planner notification with the plan of the next 7 days, and brings the IF end notification in line
 * with the running fast. Runs one at a time: calls that arrive during a run are answered by one more run after it.
 * Never rejects and never asks for permission; without permission it only removes what was pending.
 */
export function rescheduleAll(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await replan();
      } while (again);
    } catch {
      // The next foreground, settings change or midnight tries again.
    } finally {
      running = null;
    }
  })();
  return running;
}

/**
 * Dev screen: a test notification in 5 seconds. Asks for permission if the system still allows a prompt.
 * Returns false when notifications are not allowed or the system refused.
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    if (!(await ensureNotificationPermission())) return false;
    await schedule(TEST_ID, nowMs() + 5000, t('notif.test.title'), t('notif.test.body'));
    return true;
  } catch {
    return false;
  }
}

/** Everything pending in the system, earliest first. Empty when the system cannot be asked. */
export async function listScheduled(): Promise<ScheduledItem[]> {
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    return pending
      .map(({ identifier, content }): ScheduledItem => {
        const at: unknown = content.data?.at;
        return {
          id: identifier,
          at: typeof at === 'number' ? at : null,
          title: content.title ?? '',
          body: content.body ?? '',
        };
      })
      .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity) || a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

/**
 * Call once at app start (root layout). Shows notifications while the app is open, creates the Android channel and
 * keeps the pending reminders current: now, on every return to the foreground, on every settings change and when
 * the day changes. Returns the function that stops it.
 */
export function startNotificationSync(): () => void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  void rescheduleAll();
  const offSettings = settingsStore().subscribe(() => void rescheduleAll());
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void rescheduleAll();
  });

  // The clock ticks about once a second; only a new day or a moved dev clock changes what is pending.
  let day = localFromEpoch(nowMs()).n;
  let skew = clockSkewMs();
  const offClock = subscribeClock(() => {
    const today = localFromEpoch(nowMs()).n;
    const nextSkew = clockSkewMs();
    if (today === day && Math.abs(nextSkew - skew) < 2000) return;
    day = today;
    skew = nextSkew;
    void rescheduleAll();
  });

  return () => {
    offSettings();
    appState.remove();
    offClock();
  };
}
