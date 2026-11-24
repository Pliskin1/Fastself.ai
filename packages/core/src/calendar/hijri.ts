import type { DayNum, HijriDate } from '../types';

/** Tabular (arithmetic) Hijri date of day n, applied to n - shift. */
export function tabularHijri(n: DayNum, shift: number = 0): HijriDate {
  const jd = n - shift + 2440588;
  let l = jd - 1948440 + 10632;
  const cycle = Math.floor((l - 1) / 10631);
  l = l - 10631 * cycle + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const m = Math.floor((24 * l) / 709);
  const d = l - Math.floor((709 * m) / 24);
  return { y: 30 * cycle + j - 30, m, d };
}
