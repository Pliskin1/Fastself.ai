import { isoDate, parseIsoDate } from '@fastself/core';
import type { DayNum, ExceptionReason } from '@fastself/core';
import { getSettings, updateSettings } from '@/store/settings';
import { getDb } from '../index';

export interface DayMark {
  n: DayNum;
  kind: 'exception' | 'nafila' | 'kaza_done';
  /** Only exceptions have a reason. It is local only and never synced. */
  reason: ExceptionReason | null;
}

interface Row {
  day: string;
  kind: DayMark['kind'];
  reason: ExceptionReason | null;
}

export const dayMarks = {
  /** Marks the day as "ne postim". The settings store updates too, so `useDayPlan` shows it at once. */
  setException(n: DayNum, reason: ExceptionReason): void {
    updateSettings({ exceptions: { ...getSettings().exceptions, [n]: reason } });
  },

  /** Removes the exception of the day, if there is one. */
  clear(n: DayNum): void {
    const exceptions = { ...getSettings().exceptions };
    if (!(n in exceptions)) return;
    delete exceptions[n];
    updateSettings({ exceptions });
  },

  /** All marks from `from` to `to`, both included, oldest first. */
  list(from: DayNum, to: DayNum): DayMark[] {
    const rows = getDb().all<Row>(
      'SELECT day, kind, reason FROM day_marks WHERE deleted = 0 AND day BETWEEN ? AND ? ORDER BY day, kind',
      [isoDate(from), isoDate(to)],
    );
    const marks: DayMark[] = [];
    for (const row of rows) {
      const n = parseIsoDate(row.day);
      if (n !== null)
        marks.push({ n, kind: row.kind, reason: row.kind === 'exception' ? (row.reason ?? 'drugo') : null });
    }
    return marks;
  },
};
