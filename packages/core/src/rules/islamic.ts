import { fromDayNum } from '../calendar/daynum';
import { HIJRI_MONTHS } from '../calendar/format';
import { tabularHijri } from '../calendar/hijri';
import type { DayNum, HijriDate, RamadanMonth, Settings } from '../types';

/** Voluntary (nafila) fast suggestion for a day, or null. Callers skip it during Ramadan. */
export function nafilaSuggestion(n: DayNum, h: HijriDate): string | null {
  if (h.m === 9) return null;
  if (h.m === 10 && h.d === 1) return null;
  if (h.m === 12 && h.d >= 10 && h.d <= 13) return null;
  if (h.m === 12 && h.d === 9) return 'Dan Arefata';
  if (h.m === 1 && (h.d === 9 || h.d === 10)) return 'Ašura';
  if (h.m === 10 && h.d >= 2 && h.d <= 7) return 'Šest dana ševvala';
  if (h.d >= 13 && h.d <= 15) return `Bijeli dani, ${h.d}. ${HIJRI_MONTHS[h.m - 1]}`;
  const wd = fromDayNum(n).wd;
  if (wd === 1) return 'Ponedjeljak, sunnet post';
  if (wd === 4) return 'Četvrtak, sunnet post';
  return null;
}

/** The Ramadan that day n belongs to (calendar only: practice flags are the caller's concern), or null. */
export function ramadanMonth(n: DayNum, s: Pick<Settings, 'ramadanShift' | 'exceptions'>): RamadanMonth | null {
  const h = tabularHijri(n, s.ramadanShift);
  if (h.m !== 9) return null;
  const start = n - (h.d - 1);
  const length = tabularHijri(start + 29, s.ramadanShift).m === 9 ? 30 : 29;
  const exceptionDays = Object.keys(s.exceptions)
    .map(Number)
    .filter((e) => e >= start && e < start + length)
    .sort((a, b) => a - b);
  return {
    year: h.y,
    day: h.d,
    length,
    start,
    qadr: start + 25,
    bajram: start + length,
    kazaCount: exceptionDays.length,
    exceptionDays,
  };
}

/** Days until the next 1 Ramadan; null while Ramadan is running. */
export function ramadanCountdown(n: DayNum, s: Pick<Settings, 'ramadanShift'>): { days: number; start: DayNum } | null {
  if (tabularHijri(n, s.ramadanShift).m === 9) return null;
  for (let i = 1; i <= 400; i++) {
    const h = tabularHijri(n + i, s.ramadanShift);
    if (h.m === 9 && h.d === 1) return { days: i, start: n + i };
  }
  return null;
}
