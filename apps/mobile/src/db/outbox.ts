import { kvGet, type KvKey } from './repo/kv';
import type { Db } from './types';

export type SyncTable = 'practices' | 'allergies' | 'fasting_sessions' | 'day_marks' | 'meal_plans';

const CONSENT_KEY: Record<SyncTable, KvKey> = {
  practices: 'consent_sync_practices',
  allergies: 'consent_sync_allergies',
  fasting_sessions: 'consent_sync_history',
  day_marks: 'consent_sync_history',
  meal_plans: 'consent_sync_history',
};

/**
 * Queues a row of a syncable table for the next push. It writes nothing unless a user is signed in and the consent
 * for that table is on, so a guest never builds up an outbox. Soft deletes are queued as `upsert` (the row carries
 * `deleted = 1`).
 */
export function enqueue(db: Db, tbl: SyncTable, rowId: string, op: 'upsert' | 'delete' = 'upsert'): void {
  if (!kvGet(db, 'auth_user_id') || kvGet(db, CONSENT_KEY[tbl]) !== '1') return;
  db.run('INSERT INTO outbox (tbl, row_id, op, created_at) VALUES (?, ?, ?, ?)', [tbl, rowId, op, Date.now()]);
}
