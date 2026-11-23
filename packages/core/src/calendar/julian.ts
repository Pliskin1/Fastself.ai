import type { DayNum, LocalDate } from '../types';
import { fromDayNum } from './daynum';

/** Julian ("po starom") date of a Gregorian day: 13 days earlier (valid until 2100). */
export function julianDate(n: DayNum): LocalDate {
  return fromDayNum(n - 13);
}
