import { newId } from './ids';
import { migrate } from './migrations';
import { kvGet, kvSet } from './repo/kv';
import { openDeviceDb } from './sqlite';
import type { Db } from './types';

export type { AppSettings, Db, SqlValue } from './types';

let current: Db | null = null;

function prepare(db: Db): Db {
  migrate(db);
  if (!kvGet(db, 'install_id')) kvSet(db, 'install_id', newId());
  return db;
}

function openDefault(): Db {
  try {
    return openDeviceDb();
  } catch (error) {
    if (typeof jest !== 'undefined') {
      throw new Error('No test database. Render with withProviders() or call installTestDb() from @/test/utils.');
    }
    throw error;
  }
}

/** The app database. The first call opens it, runs pending migrations and makes sure `install_id` exists. */
export function getDb(): Db {
  current ??= prepare(openDefault());
  return current;
}

/** Tests only: swap the database for an in-memory one. Pass null to go back to the device database. */
export function setDb(db: Db | null): void {
  current = db ? prepare(db) : null;
}

/** "Obriši podatke sa telefona": drops every table, re-runs the migrations and keeps only `install_id`. */
export function wipeLocalData(): void {
  const db = getDb();
  db.transaction(() => {
    const installId = kvGet(db, 'install_id');
    const tables = db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    );
    for (const { name } of tables) db.exec(`DROP TABLE "${name}"`);
    db.exec('PRAGMA user_version = 0');
    migrate(db);
    kvSet(db, 'install_id', installId ?? newId());
  });
}
