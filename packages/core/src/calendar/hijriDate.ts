import type { DayNum, HijriDate } from '../types';
import { parseIsoDate } from './daynum';
import { tabularHijri } from './hijri';
import { getIslamicPack } from './hijriPack';

interface MonthRow {
  y: number;
  m: number;
  start: DayNum;
  length: number;
}
interface Table {
  rows: MonthRow[];
  first: DayNum;
  lastStart: DayNum;
  delta: number;
}

const idx = (y: number, m: number): number => y * 12 + (m - 1);

/** First day (DayNum) of a Hijri month in the tabular calendar, derived from tabularHijri itself. */
export function tabularMonthStart(y: number, m: number): DayNum {
  const target = idx(y, m);
  let n = Math.round((y - 1) * 354.36667 + (m - 1) * 29.530588) - 492148;
  let h = tabularHijri(n);
  while (idx(h.y, h.m) < target) h = tabularHijri(++n);
  while (idx(h.y, h.m) > target) h = tabularHijri(--n);
  return n - (h.d - 1);
}

/** Tabular length (29 or 30) of a Hijri month, derived from tabularHijri. */
export function tabularMonthLength(y: number, m: number): number {
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return tabularMonthStart(ny, nm) - tabularMonthStart(y, m);
}

let table: Table | null = null;

/** Builds the month table from the anchors. Throws when a month would not be 29 or 30 days long. */
function buildTable(): Table {
  const anchors = getIslamicPack().monthStarts.map((a) => {
    const start = parseIsoDate(a.start);
    if (start === null) throw new Error(`islamic pack: bad date ${a.start}`);
    return { y: Number(a.hijri.slice(0, 4)), m: Number(a.hijri.slice(5)), start };
  });
  const rows: MonthRow[] = [];
  for (let i = 0; i + 1 < anchors.length; i++) {
    const a = anchors[i]!;
    const b = anchors[i + 1]!;
    if (idx(b.y, b.m) <= idx(a.y, a.m) || b.start <= a.start) {
      throw new Error(`islamic pack: anchors out of order at ${b.y}-${b.m}`);
    }
    let y = a.y;
    let m = a.m;
    let start = a.start;
    while (idx(y, m) < idx(b.y, b.m)) {
      const ny = m === 12 ? y + 1 : y;
      const nm = m === 12 ? 1 : m + 1;
      const last = idx(ny, nm) === idx(b.y, b.m);
      const length = last ? b.start - start : tabularMonthLength(y, m);
      if (length !== 29 && length !== 30) throw new Error(`islamic pack: month ${y}-${m} would last ${length} days`);
      rows.push({ y, m, start, length });
      start += length;
      y = ny;
      m = nm;
    }
  }
  const lastA = anchors[anchors.length - 1]!;
  const delta = lastA.start - tabularMonthStart(lastA.y, lastA.m);
  return { rows, first: anchors[0]!.start, lastStart: lastA.start, delta };
}

/** The month table built from the pack (cached). Exposed for tests. */
export function monthTable(): readonly Readonly<MonthRow>[] {
  table ??= buildTable();
  return table.rows;
}

/**
 * Hijri date of a day. Uses the known month starts of the Islamic pack (Diyanet), plain tabular Hijri before
 * them, and tabular Hijri shifted to match the last known start after them. `shift` moves the calendar (m = n - shift).
 */
export function hijriDate(n: DayNum, shift: number = 0): HijriDate {
  table ??= buildTable();
  const m = n - shift;
  if (m < table.first) return tabularHijri(n, shift);
  if (m >= table.lastStart) return tabularHijri(m, table.delta);
  const row = table.rows.find((r) => m >= r.start && m < r.start + r.length)!;
  return { y: row.y, m: row.m, d: m - row.start + 1 };
}
