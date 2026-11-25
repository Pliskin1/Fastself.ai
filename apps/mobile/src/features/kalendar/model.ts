import { MONTHS_GEN, fromDayNum, monthGrid, toDayNum, type DayNum, type DayPlan, type FoodLevel } from '@fastself/core';
import { t } from '@/copy/sr';

export interface MonthRef {
  y: number;
  m: number;
}

export type OrbKind = 'level' | 'ramadan';

export interface CellModel {
  n: DayNum;
  day: number;
  plan: DayPlan;
  orb: OrbKind;
  level: FoodLevel;
  nafila: boolean;
  slava: string | null;
}

export const monthOf = (n: DayNum): MonthRef => {
  const { y, m } = fromDayNum(n);
  return { y, m };
};

/** The month `delta` months away; the year rolls over in both directions. */
export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const index = ref.y * 12 + (ref.m - 1) + delta;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

export const sameMonth = (a: MonthRef, b: MonthRef): boolean => a.y === b.y && a.m === b.m;

export const firstOfMonth = (ref: MonthRef): DayNum => toDayNum(ref.y, ref.m, 1);

/** The day to select after changing the month: today inside its own month, else the 1st. */
export const selectionFor = (ref: MonthRef, today: DayNum): DayNum =>
  sameMonth(ref, monthOf(today)) ? today : firstOfMonth(ref);

export const weekdayHeader = (): string[] => t('kal.weekdays').split(', ');

/** Grid slots (Monday first) with a null for the blanks around the month. */
export const gridSlots = (ref: MonthRef): (DayNum | null)[] => monthGrid(ref.y, ref.m);

export function cellModel(plan: DayPlan, slavaName: string | null): CellModel {
  return {
    n: plan.n,
    day: plan.date.d,
    plan,
    orb: plan.headline === 'ramadan' ? 'ramadan' : 'level',
    level: plan.level,
    nafila: plan.nafila !== null,
    slava: slavaName,
  };
}

/** "4. decembar" */
export const dayLabel = (n: DayNum): string => {
  const { d, m } = fromDayNum(n);
  return `${d}. ${MONTHS_GEN[m - 1]}`;
};

export function cellA11y(cell: CellModel, isToday: boolean): string {
  const base = t('kal.cell.a11y', {
    date: dayLabel(cell.n),
    title: cell.plan.title,
    today: isToday ? t('kal.cell.todaySuffix') : '',
  });
  return cell.slava ? base + t('kal.cell.slavaSuffix', { name: cell.slava }) : base;
}
