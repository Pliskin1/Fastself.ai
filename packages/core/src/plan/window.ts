import type { EatWindow, IfPlan, PrayerTimes } from '../types';

/** Eating window ends at 20:00 (minutes from midnight). */
const IF_END = 20 * 60;

/**
 * The eating window of a day (DOMAIN section 6 and 7). Ramadan or a fasted nafila day: maghrib to the same
 * day's fajr + 24 h, capped by the IF plan when IF is on. IF only: ends at 20:00.
 */
export function eatingWindow(input: {
  ramadan: boolean;
  nafilaFast: boolean;
  times: PrayerTimes | null;
  ifHours: 0 | IfPlan;
}): EatWindow | null {
  const { ramadan, nafilaFast, times, ifHours } = input;
  if ((ramadan || nafilaFast) && times) {
    const start = times.maghrib;
    let end = times.fajr + 1440;
    if (ifHours) end = Math.min(end, start + (24 - ifHours) * 60);
    return { start, end, kind: ramadan ? 'ramazan' : 'nafila', ifInside: ifHours > 0 };
  }
  if (ifHours) return { start: IF_END - (24 - ifHours) * 60, end: IF_END, kind: 'if', ifInside: false };
  return null;
}

/** Is the minute-of-day (0..1439) inside the window? Handles windows that pass midnight. */
export function inWindow(minutes: number, w: Pick<EatWindow, 'start' | 'end'>): boolean {
  const len = (((w.end - w.start) % 1440) + 1440) % 1440;
  const into = (((minutes - w.start) % 1440) + 1440) % 1440;
  return into < len;
}
