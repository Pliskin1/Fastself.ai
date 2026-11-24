import * as Location from 'expo-location';
import { nearestCity } from '@/lib/location';

jest.mock('expo-location', () => ({
  Accuracy: { Low: 2 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));

const permission = jest.mocked(Location.requestForegroundPermissionsAsync);
const current = jest.mocked(Location.getCurrentPositionAsync);
const lastKnown = jest.mocked(Location.getLastKnownPositionAsync);

const fix = (latitude: number, longitude: number) => ({ coords: { latitude, longitude } }) as Location.LocationObject;
const allow = (granted: boolean) => permission.mockResolvedValue({ granted } as Location.LocationPermissionResponse);

beforeEach(() => {
  jest.resetAllMocks();
  lastKnown.mockResolvedValue(null);
});
afterEach(() => jest.useRealTimers());

describe('nearestCity', () => {
  it('returns null and reads no position when the user refuses', async () => {
    allow(false);
    await expect(nearestCity()).resolves.toBeNull();
    expect(current).not.toHaveBeenCalled();
    expect(lastKnown).not.toHaveBeenCalled();
  });

  it('asks for a coarse fix and returns only the nearest city', async () => {
    allow(true);
    current.mockResolvedValue(fix(42.1, 19.09)); // just outside Bar
    await expect(nearestCity()).resolves.toBe('bar');
    expect(current).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Low });

    current.mockResolvedValue(fix(42.84, 20.16));
    await expect(nearestCity()).resolves.toBe('rozaje');
  });

  it('falls back to the last known position when a fresh fix fails', async () => {
    allow(true);
    current.mockRejectedValue(new Error('location is off'));
    lastKnown.mockResolvedValue(fix(43.35, 19.36));
    await expect(nearestCity()).resolves.toBe('pljevlja');
  });

  it('gives up after ten seconds without a fix instead of waiting forever', async () => {
    jest.useFakeTimers();
    allow(true);
    current.mockReturnValue(new Promise(() => undefined)); // never resolves, like an emulator without GPS
    const result = nearestCity();
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toBeNull();
    expect(lastKnown).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('returns null when the permission request itself fails', async () => {
    permission.mockRejectedValue(new Error('no activity'));
    await expect(nearestCity()).resolves.toBeNull();
  });
});
