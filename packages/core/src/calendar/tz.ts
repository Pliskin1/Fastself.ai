import type { DayNum } from '../types';
import { fromDayNum, toDayNum } from './daynum';

const MS_DAY = 864e5;
const MS_MIN = 6e4;

/** Last Sunday of the month (month 1-12). */
export function lastSunday(y: number, m: number): DayNum {
  const last = toDayNum(y, m + 1, 1) - 1;
  return last - fromDayNum(last).wd;
}

/** Europe/Podgorica summer time (UTC+2): last Sunday of March up to the last Sunday of October (date level). */
export function isSummerTime(n: DayNum): boolean {
  const { y } = fromDayNum(n);
  return n >= lastSunday(y, 3) && n < lastSunday(y, 10);
}

/** UTC offset of Europe/Podgorica in minutes (60 or 120). Switches at 01:00 UTC on the EU Sundays. */
export function utcOffsetMinutes(ms: number): 60 | 120 {
  const y = new Date(ms).getUTCFullYear();
  const start = lastSunday(y, 3) * MS_DAY + 3600e3;
  const end = lastSunday(y, 10) * MS_DAY + 3600e3;
  return ms >= start && ms < end ? 120 : 60;
}

/** Podgorica calendar day and minutes from local midnight for an epoch in ms. */
export function localFromEpoch(ms: number): { n: DayNum; minutes: number } {
  const local = ms + utcOffsetMinutes(ms) * MS_MIN;
  const n = Math.floor(local / MS_DAY);
  return { n, minutes: Math.floor((local - n * MS_DAY) / MS_MIN) };
}

/** Epoch ms of a Podgorica local day and minutes. In the skipped or repeated hour the earlier offset wins. */
export function epochFromLocal(n: DayNum, minutes: number): number {
  const local = n * MS_DAY + minutes * MS_MIN;
  const o1 = utcOffsetMinutes(local - 60 * MS_MIN);
  const cand = local - o1 * MS_MIN;
  const o2 = utcOffsetMinutes(cand);
  return o2 === o1 ? cand : local - o2 * MS_MIN;
}
