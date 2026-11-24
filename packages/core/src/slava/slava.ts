import { fromDayNum, toDayNum } from '../calendar/daynum';
import { DEFAULT_SETTINGS } from '../settings';
import { dayPlan } from '../plan/dayPlan';
import type { DayNum, NextSlava, Settings, SlavaId } from '../types';

export interface SlavaInfo {
  id: SlavaId;
  name: string;
  m: number;
  d: number;
}

/** Gregorian dates of the supported slavas. */
export const SLAVE: readonly SlavaInfo[] = [
  { id: 'nikola', name: 'Sveti Nikola', m: 12, d: 19 },
  { id: 'jovan', name: 'Sveti Jovan', m: 1, d: 20 },
  { id: 'djurdjevdan', name: 'Đurđevdan', m: 5, d: 6 },
  { id: 'vasilije', name: 'Sveti Vasilije Ostroški', m: 5, d: 12 },
  { id: 'arandjel', name: 'Aranđelovdan', m: 11, d: 21 },
  { id: 'mitrovdan', name: 'Mitrovdan', m: 11, d: 8 },
  { id: 'lucindan', name: 'Lučindan', m: 10, d: 31 },
  { id: 'petrovdan', name: 'Petrovdan', m: 7, d: 12 },
  { id: 'ilindan', name: 'Ilindan', m: 8, d: 2 },
  { id: 'stefan', name: 'Sveti Stefan', m: 1, d: 9 },
];

/**
 * Next occurrence (today included) of a slava, with the day plan for it. Slava is an Orthodox feast, so the
 * plan is computed with the Orthodox rule on. Without settings: orthodox on, strictness voda.
 */
export function nextSlava(today: DayNum, slavaId: SlavaId | null, s?: Settings): NextSlava | null {
  const info = SLAVE.find((x) => x.id === slavaId);
  if (!info) return null;
  const { y } = fromDayNum(today);
  let n = toDayNum(y, info.m, info.d);
  if (n < today) n = toDayNum(y + 1, info.m, info.d);
  const base = s ?? DEFAULT_SETTINGS;
  const plan = dayPlan(n, { ...base, practices: { ...base.practices, orthodox: true }, exceptions: {} });
  const level = plan.ruleLevel;
  return {
    id: info.id,
    name: info.name,
    n,
    daysUntil: n - today,
    plan,
    posna: plan.orthFast,
    level,
    askPriest: level === 'voda' || level === 'ulje',
  };
}
