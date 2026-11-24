import type { DayNum, LocalDate } from '../types';

const MS_DAY = 864e5;

/** Days since 1970-01-01 of the calendar date (UTC math, never the host zone). */
export function toDayNum(y: number, m: number, d: number): DayNum {
  return Math.floor(Date.UTC(y, m - 1, d) / MS_DAY);
}

export function fromDayNum(n: DayNum): LocalDate {
  const dt = new Date(n * MS_DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
}

const pad = (v: number, w = 2): string => String(v).padStart(w, '0');

export function isoDate(n: DayNum): string {
  const { y, m, d } = fromDayNum(n);
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** Parses strict YYYY-MM-DD; returns null for malformed or impossible dates. */
export function parseIsoDate(s: string): DayNum | null {
  const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!mt) return null;
  const y = Number(mt[1]);
  const m = Number(mt[2]);
  const d = Number(mt[3]);
  const n = toDayNum(y, m, d);
  const back = fromDayNum(n);
  return back.y === y && back.m === m && back.d === d ? n : null;
}

export function daysInMonth(y: number, m: number): number {
  return toDayNum(y, m + 1, 1) - toDayNum(y, m, 1);
}

/** Month grid, Monday first, padded with null to whole weeks. */
export function monthGrid(y: number, m: number): (DayNum | null)[] {
  const first = toDayNum(y, m, 1);
  const lead = (fromDayNum(first).wd + 6) % 7;
  const cells: (DayNum | null)[] = Array.from({ length: lead }, () => null);
  const len = daysInMonth(y, m);
  for (let i = 0; i < len; i++) cells.push(first + i);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
