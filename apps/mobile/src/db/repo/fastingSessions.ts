import { epochFromLocal, localFromEpoch } from '@fastself/core';
import type { DayNum, IfPlan } from '@fastself/core';
import { nowMs } from '@/lib/clock';
import { newId } from '../ids';
import { getDb } from '../index';
import { enqueue } from '../outbox';
import type { Db } from '../types';

export interface FastingSession {
  id: string;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms; null while the fast is running. */
  endedAt: number | null;
  targetHours: IfPlan;
  kind: 'if' | 'nafila';
}

/** One bar of the "Zadnjih 7 dana" chart. */
export interface FastDay {
  n: DayNum;
  /** Longest fast that ended on this day, in hours with one decimal; 0 when there was none. */
  hours: number;
  /** True when the value is the fast that is still running. */
  running: boolean;
}

interface Row {
  id: string;
  started_at: number;
  ended_at: number | null;
  target_hours: number;
  kind: string;
}

const COLUMNS = 'id, started_at, ended_at, target_hours, kind';

const toSession = (row: Row): FastingSession => ({
  id: row.id,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  targetHours: row.target_hours as IfPlan,
  kind: row.kind === 'nafila' ? 'nafila' : 'if',
});

function runningRow(db: Db): Row | null {
  return db.first<Row>(
    `SELECT ${COLUMNS} FROM fasting_sessions WHERE ended_at IS NULL AND deleted = 0 ORDER BY started_at DESC LIMIT 1`,
  );
}

export const fastingSessions = {
  /** Starts an IF fast now. If one is already running it is returned unchanged, so a fast is never lost. */
  start(planH: IfPlan): FastingSession {
    const db = getDb();
    return db.transaction(() => {
      const open = runningRow(db);
      if (open) return toSession(open);
      const session: FastingSession = {
        id: newId(),
        startedAt: nowMs(),
        endedAt: null,
        targetHours: planH,
        kind: 'if',
      };
      db.run(
        'INSERT INTO fasting_sessions (id, started_at, ended_at, target_hours, kind, updated_at) VALUES (?, ?, NULL, ?, ?, ?)',
        [session.id, session.startedAt, session.targetHours, session.kind, Date.now()],
      );
      enqueue(db, 'fasting_sessions', session.id);
      return session;
    });
  },

  /** Ends the running fast now and returns it; null when nothing is running. */
  stop(): FastingSession | null {
    const db = getDb();
    return db.transaction(() => {
      const open = runningRow(db);
      if (!open) return null;
      const endedAt = Math.max(nowMs(), open.started_at);
      db.run('UPDATE fasting_sessions SET ended_at = ?, updated_at = ? WHERE id = ?', [endedAt, Date.now(), open.id]);
      enqueue(db, 'fasting_sessions', open.id);
      return toSession({ ...open, ended_at: endedAt });
    });
  },

  /** The running fast, or null. */
  current(): FastingSession | null {
    const open = runningRow(getDb());
    return open ? toSession(open) : null;
  },

  /** Seven days, oldest first and today last. A fast counts on the day it ended; a running fast counts today. */
  last7(): FastDay[] {
    const now = nowMs();
    const today = localFromEpoch(now).n;
    const first = today - 6;
    const best = new Map<DayNum, { minutes: number; running: boolean }>();
    const rows = getDb().all<Row>(
      `SELECT ${COLUMNS} FROM fasting_sessions WHERE deleted = 0 AND (ended_at IS NULL OR ended_at >= ?)`,
      [epochFromLocal(first, 0)],
    );
    for (const row of rows) {
      const end = row.ended_at ?? now;
      const n = localFromEpoch(end).n;
      if (n < first || n > today) continue;
      const minutes = Math.max(0, Math.floor((end - row.started_at) / 60000));
      const known = best.get(n);
      if (!known || minutes > known.minutes) best.set(n, { minutes, running: row.ended_at === null });
    }
    return Array.from({ length: 7 }, (_, i) => {
      const n = first + i;
      const day = best.get(n);
      return { n, hours: day ? Math.round(day.minutes / 6) / 10 : 0, running: day?.running ?? false };
    });
  },
};
