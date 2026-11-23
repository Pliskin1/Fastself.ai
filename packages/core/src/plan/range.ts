import type { DayNum, DayPlan, RangeStats, Settings } from '../types';
import { dayPlan } from './dayPlan';

/** Plans for `days` consecutive days starting at `start`. */
export function nextDays(start: DayNum, days: number, s: Settings): DayPlan[] {
  return Array.from({ length: Math.max(0, days) }, (_, i) => dayPlan(start + i, s));
}

/** Counts each day once: its level if an Orthodox fast, else ramadan, else free. Exception days are free. */
export function rangeStats(start: DayNum, days: number, s: Settings): RangeStats {
  const st: RangeStats = { days: 0, voda: 0, ulje: 0, riba: 0, bezmesa: 0, ramadan: 0, free: 0, nafila: 0 };
  for (const p of nextDays(start, days, s)) {
    st.days += 1;
    if (p.exception) st.free += 1;
    else if (p.orthFast && p.level !== 'mrsno') st[p.level] += 1;
    else if (p.ramadanDay > 0) st.ramadan += 1;
    else st.free += 1;
    if (p.nafila) st.nafila += 1;
  }
  return st;
}
