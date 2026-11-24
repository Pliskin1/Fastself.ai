import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ensureNotificationPermission, REMINDERS_CHANNEL } from '@/notifications/permissions';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

const channel = jest.mocked(Notifications.setNotificationChannelAsync);
const get = jest.mocked(Notifications.getPermissionsAsync);
const request = jest.mocked(Notifications.requestPermissionsAsync);

const status = (granted: boolean, canAskAgain = true) =>
  ({ granted, canAskAgain }) as Notifications.NotificationPermissionsStatus;

beforeEach(() => jest.resetAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('ensureNotificationPermission', () => {
  it('returns true without a prompt when notifications are already allowed', async () => {
    get.mockResolvedValue(status(true));
    await expect(ensureNotificationPermission()).resolves.toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it('asks once and returns the answer', async () => {
    get.mockResolvedValue(status(false));
    request.mockResolvedValue(status(true));
    await expect(ensureNotificationPermission()).resolves.toBe(true);

    request.mockResolvedValue(status(false, false));
    await expect(ensureNotificationPermission()).resolves.toBe(false);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('returns false without a prompt when the system no longer allows asking', async () => {
    get.mockResolvedValue(status(false, false));
    await expect(ensureNotificationPermission()).resolves.toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it('returns false when the system call fails', async () => {
    get.mockRejectedValue(new Error('unavailable'));
    await expect(ensureNotificationPermission()).resolves.toBe(false);
  });

  it('iOS needs no channel', async () => {
    get.mockResolvedValue(status(true));
    await ensureNotificationPermission();
    expect(channel).not.toHaveBeenCalled();
  });

  it('Android creates the channel "podsjetnici" (high importance) before it checks or asks', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    get.mockResolvedValue(status(false));
    request.mockResolvedValue(status(true));

    await expect(ensureNotificationPermission()).resolves.toBe(true);

    expect(REMINDERS_CHANNEL).toBe('podsjetnici');
    expect(channel).toHaveBeenCalledWith('podsjetnici', {
      name: 'Podsjetnici',
      importance: Notifications.AndroidImportance.HIGH,
    });
    const order = [channel, get, request].map((mock) => mock.mock.invocationCallOrder[0] ?? 0);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((position) => position > 0)).toBe(true);
  });

  it('Android without a working channel does not ask (the prompt would not show)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    channel.mockRejectedValue(new Error('no channel'));
    await expect(ensureNotificationPermission()).resolves.toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
});
