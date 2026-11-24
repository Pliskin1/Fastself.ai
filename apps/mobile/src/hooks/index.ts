import { dayPlan, localFromEpoch, nextDays, rangeStats } from '@fastself/core';
import type { DayNum, DayPlan, RangeStats } from '@fastself/core';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useStore } from 'zustand';
import type { AppSettings } from '@/db/types';
import { nowMs, subscribeClock } from '@/lib/clock';
import { settingsStore, updateSettings } from '@/store/settings';

export type { AppSettings } from '@/db/types';

const minuteOfDay = (): number => localFromEpoch(nowMs()).minutes;
const today = (): DayNum => localFromEpoch(nowMs()).n;

/** The user's settings (core `Settings` plus `onboarded`). Read from SQLite on first use, so it is never empty. */
export function useSettings(): AppSettings {
  return useStore(settingsStore(), (state) => state.settings);
}

/** Returns a stable function that merges a top-level patch into the settings and saves it. */
export function useUpdateSettings(): (patch: Partial<AppSettings>) => void {
  return updateSettings;
}

/**
 * The app clock (the dev clock in __DEV__).
 * - `now`: epoch ms in a shared value, updated every second without re-rendering.
 * - `minute`: minutes from Podgorica midnight (0–1439); the component re-renders when it changes.
 */
export function useNow(): { now: SharedValue<number>; minute: number } {
  const now = useSharedValue(nowMs());
  const minute = useSyncExternalStore(subscribeClock, minuteOfDay);
  useEffect(() => {
    const tick = () => {
      now.value = nowMs();
    };
    tick();
    return subscribeClock(tick);
  }, [now]);
  return { now, minute };
}

/** Today's Podgorica calendar day. The component re-renders at midnight and when the dev clock moves the date. */
export function useToday(): DayNum {
  return useSyncExternalStore(subscribeClock, today);
}

/** The plan of a day (today when `n` is omitted), recomputed when the settings or the day change. */
export function useDayPlan(n?: DayNum): DayPlan {
  const settings = useSettings();
  const current = useToday();
  const day = n ?? current;
  return useMemo(() => dayPlan(day, settings), [day, settings]);
}

/** Plans and statistics of 7 or 30 days from `start`. */
export function useRange(start: DayNum, days: 7 | 30): { plans: DayPlan[]; stats: RangeStats } {
  const settings = useSettings();
  return useMemo(
    () => ({ plans: nextDays(start, days, settings), stats: rangeStats(start, days, settings) }),
    [start, days, settings],
  );
}
