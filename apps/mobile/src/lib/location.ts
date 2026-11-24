import { closestCity, type CityId } from '@fastself/core';
import * as Location from 'expo-location';

const FIX_TIMEOUT_MS = 10_000;

/** A coarse fix, or null if the phone has none within the timeout (indoors, emulator, location switched off). */
async function currentPosition(): Promise<Location.LocationObject | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), FIX_TIMEOUT_MS);
  });
  try {
    return await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Asks for foreground location (coarse is enough) and returns the nearest supported city, for the vaktija.
 * The coordinates are used once for that lookup and are never stored, logged or sent anywhere.
 * Returns null when the user refuses or the phone cannot tell where it is.
 */
export async function nearestCity(): Promise<CityId | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;
    const position = (await currentPosition()) ?? (await Location.getLastKnownPositionAsync());
    return position ? closestCity(position.coords.latitude, position.coords.longitude) : null;
  } catch {
    return null;
  }
}
