import type { Db } from './types';

// Schema: docs/DATABASE.md §1. Times are epoch ms, days are YYYY-MM-DD, ids are uuid v4 made on the device.
const V1 = `
CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE practices (id TEXT PRIMARY KEY, practice TEXT NOT NULL CHECK (practice IN ('orthodox','ramadan','nafila','if')),
  active INTEGER NOT NULL, settings TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE TABLE allergies (id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('allergen','custom','diet')),
  code TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, UNIQUE(kind, code));
CREATE TABLE fasting_sessions (id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, ended_at INTEGER,
  target_hours INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'if', updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE TABLE day_marks (id TEXT PRIMARY KEY, day TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('exception','nafila','kaza_done')),
  reason TEXT,
  updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, UNIQUE(day, kind));
CREATE TABLE safety (key TEXT PRIMARY KEY CHECK (key IN ('preg','diab','ed','minor')), value INTEGER NOT NULL);
CREATE TABLE meal_plans (id TEXT PRIMARY KEY, week_start TEXT NOT NULL, rule_pack_version TEXT NOT NULL,
  days TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE TABLE shopping_checks (item TEXT PRIMARY KEY, checked INTEGER NOT NULL);
CREATE TABLE outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, tbl TEXT NOT NULL, row_id TEXT NOT NULL, op TEXT NOT NULL
  CHECK (op IN ('upsert','delete')), created_at INTEGER NOT NULL);
`;

/** Migration i brings the database to `PRAGMA user_version` i + 1. Only append; never edit a shipped entry. */
export const MIGRATIONS: readonly string[] = [V1];

export function schemaVersion(db: Db): number {
  return db.first<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
}

/** Applies every migration above the stored version, each one in its own transaction. */
export function migrate(db: Db): void {
  for (let version = schemaVersion(db); version < MIGRATIONS.length; version++) {
    const sql = MIGRATIONS[version];
    if (sql === undefined) return;
    db.transaction(() => {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
