import { getDb, setDb, wipeLocalData } from '@/db';
import { MIGRATIONS, migrate, schemaVersion } from '@/db/migrations';
import { kvGet, kvSet } from '@/db/repo/kv';
import type { Db } from '@/db/types';
import { createMemoryDb } from '@/test/memoryDb';
import { installTestDb } from '@/test/utils';

const TABLES = [
  'allergies',
  'day_marks',
  'fasting_sessions',
  'kv',
  'meal_plans',
  'outbox',
  'practices',
  'safety',
  'shopping_checks',
];

const tables = (db: Db): string[] =>
  db
    .all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .map((row) => row.name);

const count = (db: Db, table: string): number => db.first<{ c: number }>(`SELECT COUNT(*) AS c FROM ${table}`)?.c ?? -1;

describe('local schema', () => {
  it('a fresh install creates every table of DATABASE.md §1 and stamps the version', () => {
    const db = installTestDb();
    expect(tables(db)).toEqual(TABLES);
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);
  });

  it('migrating an up-to-date database changes nothing and keeps the data', () => {
    const db = installTestDb();
    kvSet(db, 'onboarded', '1');
    migrate(db);
    migrate(db);
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);
    expect(kvGet(db, 'onboarded')).toBe('1');
  });

  it('rejects values outside the allowed lists', () => {
    const db = installTestDb();
    const bad = [
      "INSERT INTO practices (id, practice, active, updated_at) VALUES ('1', 'keto', 1, 0)",
      "INSERT INTO allergies (id, kind, code, updated_at) VALUES ('1', 'mood', 'x', 0)",
      "INSERT INTO day_marks (id, day, kind, updated_at) VALUES ('1', '2026-12-02', 'cheat', 0)",
      "INSERT INTO safety (key, value) VALUES ('weight', 1)",
      "INSERT INTO outbox (tbl, row_id, op, created_at) VALUES ('practices', '1', 'merge', 0)",
    ];
    for (const sql of bad) expect(() => db.exec(sql)).toThrow();
  });

  it('allows one row per allergy and one mark of a kind per day', () => {
    const db = installTestDb();
    db.exec("INSERT INTO allergies (id, kind, code, updated_at) VALUES ('1', 'allergen', 'gluten', 0)");
    expect(() =>
      db.exec("INSERT INTO allergies (id, kind, code, updated_at) VALUES ('2', 'allergen', 'gluten', 0)"),
    ).toThrow();
    db.exec("INSERT INTO day_marks (id, day, kind, updated_at) VALUES ('1', '2026-12-02', 'exception', 0)");
    db.exec("INSERT INTO day_marks (id, day, kind, updated_at) VALUES ('2', '2026-12-02', 'nafila', 0)");
    expect(() =>
      db.exec("INSERT INTO day_marks (id, day, kind, updated_at) VALUES ('3', '2026-12-02', 'exception', 0)"),
    ).toThrow();
  });

  it('gives the install a random uuid once and keeps it across restarts', () => {
    const db = installTestDb();
    const id = kvGet(db, 'install_id');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    setDb(db); // restart: the same file is opened again
    expect(kvGet(getDb(), 'install_id')).toBe(id);
    expect(kvGet(installTestDb(), 'install_id')).not.toBe(id); // another install gets another id
  });

  it('a transaction rolls back completely when it throws', () => {
    const db = installTestDb();
    expect(() =>
      db.transaction(() => {
        kvSet(db, 'onboarded', '1');
        db.transaction(() => kvSet(db, 'last_sync_at', '5')); // joins the outer transaction
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(kvGet(db, 'onboarded')).toBeNull();
    expect(kvGet(db, 'last_sync_at')).toBeNull();
    expect(db.transaction(() => 7)).toBe(7); // and the database is usable afterwards
  });

  it('wipeLocalData removes all data, keeps only install_id and leaves a working schema', () => {
    const db = installTestDb();
    const id = kvGet(db, 'install_id');
    kvSet(db, 'onboarded', '1');
    kvSet(db, 'consent_ai', '1');
    kvSet(db, 'auth_user_id', 'user-1');
    db.exec("INSERT INTO practices (id, practice, active, updated_at) VALUES ('1', 'orthodox', 1, 0)");
    db.exec("INSERT INTO safety (key, value) VALUES ('preg', 1)");
    db.exec("INSERT INTO outbox (tbl, row_id, op, created_at) VALUES ('practices', '1', 'upsert', 0)");
    db.exec("INSERT INTO shopping_checks (item, checked) VALUES ('hljeb', 1)");

    wipeLocalData();

    expect(tables(db)).toEqual(TABLES);
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);
    expect(db.all('SELECT key, value FROM kv')).toEqual([{ key: 'install_id', value: id }]);
    for (const table of TABLES.filter((name) => name !== 'kv')) expect(count(db, table)).toBe(0);
  });

  it('a test that forgot to install a database gets a clear message, not a native error', () => {
    setDb(null);
    expect(() => getDb()).toThrow('No test database');
  });

  it('a second database starts empty (tests never share data)', () => {
    const first = installTestDb();
    kvSet(first, 'onboarded', '1');
    const second = createMemoryDb();
    setDb(second);
    expect(kvGet(second, 'onboarded')).toBeNull();
  });
});
