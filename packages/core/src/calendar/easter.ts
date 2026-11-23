import type { DayNum } from '../types';
import { toDayNum } from './daynum';

/** Orthodox Easter as a Gregorian DayNum: Meeus Julian computus plus 13 days (valid 1900-2099). */
export function orthodoxEaster(y: number): DayNum {
  const a = y % 4;
  const b = y % 7;
  const c = y % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return toDayNum(y, month, day) + 13;
}
