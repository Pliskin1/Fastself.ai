import type { Db } from '../types';

/** Every key of the `kv` table (docs/DATABASE.md §1). */
export type KvKey =
  | 'settings'
  | 'onboarded'
  | 'reminders'
  | 'install_id'
  | 'consent_ai'
  | 'consent_sync_practices'
  | 'consent_sync_allergies'
  | 'consent_sync_history'
  | 'last_sync_at'
  | 'auth_user_id';

export function kvGet(db: Db, key: KvKey): string | null {
  return db.first<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key])?.value ?? null;
}

export function kvSet(db: Db, key: KvKey, value: string): void {
  db.run(
    'INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ' +
      'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    [key, value, Date.now()],
  );
}

export function kvDelete(db: Db, key: KvKey): void {
  db.run('DELETE FROM kv WHERE key = ?', [key]);
}
