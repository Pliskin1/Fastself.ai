import { DEFAULT_REMINDERS, planNotifications, toDayNum } from '@fastself/core';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { fastingSessions } from '@/db/repo';
import { freezeClock } from '@/lib/clock';
import {
  cancelIfEnd,
  listScheduled,
  rescheduleAll,
  scheduleIfEnd,
  sendTestNotification,
  startNotificationSync,
} from '@/notifications';
import { getSettings, updateSettings } from '@/store/settings';
import { at, fixtureSettings, installTestDb } from '@/test/utils';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

type Request = Notifications.NotificationRequestInput;

const channel = jest.mocked(Notifications.setNotificationChannelAsync);
const permissions = jest.mocked(Notifications.getPermissionsAsync);
const getAll = jest.mocked(Notifications.getAllScheduledNotificationsAsync);
const cancel = jest.mocked(Notifications.cancelScheduledNotificationAsync);
const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const handler = jest.mocked(Notifications.setNotificationHandler);

const NOW = at('2026-12-01T12:00');
const TODAY = toDayNum(2026, 12, 1);
const HOUR = 3600e3;

/** What the system holds: the mocked schedule, cancel and list calls all work on this map. */
let pending: Map<string, Request>;

const ids = () => [...pending.keys()].sort();
const fireTime = (id: string) => (pending.get(id)?.trigger as { date: Date } | undefined)?.date.getTime();
const status = (granted: boolean, canAskAgain = true) =>
  ({ granted, canAskAgain }) as Notifications.NotificationPermissionsStatus;
const seed = (id: string, atMs?: number) =>
  pending.set(id, {
    identifier: id,
    content: { title: `title ${id}`, body: `body ${id}`, data: atMs === undefined ? {} : { at: atMs } },
    trigger: null,
  });
/** Lets a reschedule started by a listener finish: the mocked system answers in microtasks. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
/** Moves the app clock and the real clock together, as real time passing does. */
const setTime = (epochMs: number) => {
  jest.spyOn(Date, 'now').mockReturnValue(epochMs);
  freezeClock(epochMs);
};

beforeEach(() => {
  jest.resetAllMocks();
  pending = new Map();
  schedule.mockImplementation(async (request) => {
    const id = request.identifier ?? 'auto';
    pending.set(id, request);
    return id;
  });
  cancel.mockImplementation(async (id) => {
    pending.delete(id);
  });
  getAll.mockImplementation(
    async () =>
      [...pending.entries()].map(([identifier, request]) => ({
        identifier,
        content: request.content,
        trigger: request.trigger,
      })) as unknown as Notifications.NotificationRequest[],
  );
  permissions.mockResolvedValue(status(true));
  installTestDb();
  setTime(NOW);
});

afterEach(() => {
  freezeClock(null);
  jest.restoreAllMocks();
});

describe('rescheduleAll', () => {
  it('schedules the plan of the next 7 days with text from the copy file', async () => {
    updateSettings(fixtureSettings({ orthodox: true }));
    await rescheduleAll();

    const plan = planNotifications(TODAY, getSettings(), NOW, DEFAULT_REMINDERS);
    expect(plan.length).toBeGreaterThan(0);
    expect(ids()).toEqual(plan.map((planned) => planned.id).sort());

    const evening = pending.get(`plan:eve:${TODAY}`);
    expect(evening?.content.title).toBe('Sutra je post na vodi');
    expect(evening?.content.body).toMatch(/^Na tanjiru: .+\. Ne može: .+\.$/);
    expect(evening?.content.data).toEqual({ at: at('2026-12-01T20:00') });
    expect(evening?.trigger).toEqual({
      type: 'date',
      date: new Date(at('2026-12-01T20:00')),
      channelId: 'podsjetnici',
    });
  });

  it('writes sehur and iftar with their times', async () => {
    setTime(at('2027-02-08T00:30'));
    updateSettings(fixtureSettings({ ramadan: true }));
    await rescheduleAll();

    const day = toDayNum(2027, 2, 8);
    expect(pending.get(`plan:sehur:${day}`)?.content.title).toMatch(/^Sehur do \d\d:\d\d$/);
    expect(pending.get(`plan:sehur:${day}`)?.content.body).toBe('Zora je za 30 minuta.');
    expect(pending.get(`plan:iftar:${day}`)?.content.title).toMatch(/^Akšam je, \d\d:\d\d$/);
  });

  it('replaces the planner notifications and leaves the others alone', async () => {
    updateSettings(fixtureSettings({ orthodox: true }));
    seed('plan:eve:1');
    seed('test');
    await rescheduleAll();

    expect(pending.has('plan:eve:1')).toBe(false);
    expect(pending.has('test')).toBe(true);
    expect(pending.has(`plan:eve:${TODAY}`)).toBe(true);
  });

  it('without permission it schedules nothing and removes what was planned', async () => {
    updateSettings(fixtureSettings({ orthodox: true }));
    seed('plan:eve:1');
    permissions.mockResolvedValue(status(false));
    await rescheduleAll();

    expect(ids()).toEqual([]);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('a switch turned off removes its reminders', async () => {
    updateSettings(fixtureSettings({ orthodox: true }));
    await rescheduleAll();
    expect(ids().length).toBeGreaterThan(0);

    updateSettings({ reminders: { ...DEFAULT_REMINDERS, evening: false } });
    await rescheduleAll();
    expect(ids()).toEqual([]);
  });

  it('takes the dev clock offset out of the fire time', async () => {
    // The app clock shows 1 Dec 12:00 while the phone is at 25 Nov 10:00: 20:00 app time is 8 hours away.
    jest.spyOn(Date, 'now').mockReturnValue(at('2026-11-25T10:00'));
    updateSettings(fixtureSettings({ orthodox: true }));
    await rescheduleAll();

    expect(fireTime(`plan:eve:${TODAY}`)).toBe(at('2026-11-25T18:00'));
    expect(pending.get(`plan:eve:${TODAY}`)?.content.data).toEqual({ at: at('2026-12-01T20:00') });
  });

  it('runs one at a time and answers calls made during a run with one more run', async () => {
    updateSettings(fixtureSettings({ orthodox: true }));
    const first = rescheduleAll();
    const second = rescheduleAll();
    const third = rescheduleAll();
    expect(second).toBe(first);
    expect(third).toBe(first);
    await first;

    expect(getAll).toHaveBeenCalledTimes(2);
    expect(pending.has(`plan:eve:${TODAY}`)).toBe(true);
  });

  it('never rejects, and the next call works again', async () => {
    updateSettings(fixtureSettings({ orthodox: true }));
    getAll.mockRejectedValueOnce(new Error('system'));
    await expect(rescheduleAll()).resolves.toBeUndefined();
    expect(ids()).toEqual([]);

    await rescheduleAll();
    expect(pending.has(`plan:eve:${TODAY}`)).toBe(true);
  });

  it('Android creates the channel before it schedules', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    updateSettings(fixtureSettings({ orthodox: true }));
    await rescheduleAll();

    expect(channel).toHaveBeenCalledWith('podsjetnici', { name: 'Podsjetnici', importance: 6 });
    expect(channel.mock.invocationCallOrder[0]).toBeLessThan(schedule.mock.invocationCallOrder[0] ?? 0);
  });

  it('keeps the end reminder of a running fast, and drops it when its switch is turned off', async () => {
    updateSettings(fixtureSettings({ ifOn: true }));
    fastingSessions.start(16);
    await rescheduleAll();

    expect(fireTime('if:end')).toBe(NOW + 16 * HOUR);
    expect(pending.get('if:end')?.content.title).toBe('Post je završen');
    expect(pending.get('if:end')?.content.body).toBe('16 h. Prozor za jelo je otvoren do 12:00.');

    updateSettings({ reminders: { ...DEFAULT_REMINDERS, ifEnd: false } });
    await rescheduleAll();
    expect(pending.has('if:end')).toBe(false);
  });

  it('removes a left-over end reminder when no fast is running', async () => {
    seed('if:end');
    await rescheduleAll();
    expect(pending.has('if:end')).toBe(false);
  });
});

describe('scheduleIfEnd and cancelIfEnd', () => {
  const ENDS = at('2026-12-02T12:00');

  it('schedules one notification for the end of the fast', async () => {
    updateSettings(fixtureSettings({ ifOn: true, ifPlan: 16 }));
    await scheduleIfEnd(at('2026-12-02T10:00'));
    await scheduleIfEnd(ENDS);

    expect(ids()).toEqual(['if:end']);
    expect(fireTime('if:end')).toBe(ENDS);
    expect(pending.get('if:end')?.content.body).toBe('16 h. Prozor za jelo je otvoren do 20:00.');
    expect((pending.get('if:end')?.trigger as { channelId?: string }).channelId).toBe('podsjetnici');
  });

  it('uses the hours of the running fast, not the plan chosen for the next one', async () => {
    updateSettings(fixtureSettings({ ifOn: true, ifPlan: 16 }));
    fastingSessions.start(12);
    await scheduleIfEnd(NOW + 12 * HOUR);
    expect(pending.get('if:end')?.content.body).toBe('12 h. Prozor za jelo je otvoren do 12:00.');
  });

  it('does nothing when the switch is off, the time has passed or notifications are not allowed', async () => {
    updateSettings(fixtureSettings({ ifOn: true }));
    seed('if:end');

    await scheduleIfEnd(NOW);
    expect(ids()).toEqual([]);

    permissions.mockResolvedValue(status(false));
    await scheduleIfEnd(ENDS);
    expect(ids()).toEqual([]);

    permissions.mockResolvedValue(status(true));
    updateSettings({ reminders: { ...DEFAULT_REMINDERS, ifEnd: false } });
    await scheduleIfEnd(ENDS);
    expect(ids()).toEqual([]);
  });

  it('cancelIfEnd removes it', async () => {
    updateSettings(fixtureSettings({ ifOn: true }));
    await scheduleIfEnd(ENDS);
    await cancelIfEnd();
    expect(ids()).toEqual([]);
  });

  it('neither rejects when the system fails', async () => {
    cancel.mockRejectedValue(new Error('system'));
    await expect(scheduleIfEnd(ENDS)).resolves.toBeUndefined();
    await expect(cancelIfEnd()).resolves.toBeUndefined();
  });
});

describe('listScheduled', () => {
  it('lists what is pending, earliest first, and the ones we did not time last', async () => {
    seed('foreign');
    seed('plan:iftar:2', 2000);
    seed('plan:sehur:2', 1000);

    expect(await listScheduled()).toEqual([
      { id: 'plan:sehur:2', at: 1000, title: 'title plan:sehur:2', body: 'body plan:sehur:2' },
      { id: 'plan:iftar:2', at: 2000, title: 'title plan:iftar:2', body: 'body plan:iftar:2' },
      { id: 'foreign', at: null, title: 'title foreign', body: 'body foreign' },
    ]);
  });

  it('is empty when the system cannot be asked', async () => {
    getAll.mockRejectedValue(new Error('system'));
    expect(await listScheduled()).toEqual([]);
  });
});

describe('sendTestNotification', () => {
  it('schedules the test notification 5 seconds ahead', async () => {
    await expect(sendTestNotification()).resolves.toBe(true);
    expect(fireTime('test')).toBe(NOW + 5000);
    expect(pending.get('test')?.content.title).toBe('Probno obavještenje');
  });

  it('returns false and schedules nothing when notifications are not allowed', async () => {
    permissions.mockResolvedValue(status(false, false));
    await expect(sendTestNotification()).resolves.toBe(false);
    expect(ids()).toEqual([]);
  });
});

describe('startNotificationSync', () => {
  it('reschedules at start, on a settings change, on foreground and on a new day, until it is stopped', async () => {
    const stateListeners = new Set<(state: string) => void>();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      const added = listener as (state: string) => void;
      stateListeners.add(added);
      return { remove: () => stateListeners.delete(added) } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    const toState = (state: string) => stateListeners.forEach((listener) => listener(state));
    updateSettings(fixtureSettings({ orthodox: true }));

    const stop = startNotificationSync();
    await settle();
    expect(pending.has(`plan:eve:${TODAY}`)).toBe(true);
    const shown = await handler.mock.calls[0]?.[0]?.handleNotification({} as Notifications.Notification);
    expect(shown).toMatchObject({ shouldShowBanner: true, shouldShowList: true });

    getAll.mockClear();
    updateSettings({ reminders: { ...DEFAULT_REMINDERS, evening: false } });
    await settle();
    expect(getAll).toHaveBeenCalledTimes(1);
    expect(ids()).toEqual([]);

    getAll.mockClear();
    toState('background');
    await settle();
    expect(getAll).not.toHaveBeenCalled();
    toState('active');
    await settle();
    expect(getAll).toHaveBeenCalledTimes(1);

    getAll.mockClear();
    setTime(at('2026-12-01T12:01'));
    await settle();
    expect(getAll).not.toHaveBeenCalled();
    setTime(at('2026-12-02T00:00'));
    await settle();
    expect(getAll).toHaveBeenCalledTimes(1);

    stop();
    expect(stateListeners.size).toBe(0);
    getAll.mockClear();
    updateSettings({ reminders: DEFAULT_REMINDERS });
    setTime(at('2026-12-03T00:00'));
    await settle();
    expect(getAll).not.toHaveBeenCalled();
  });
});
