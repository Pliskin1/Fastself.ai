import { makeTransaction } from '@/db/tx';
import type { Db, SqlValue } from '@/db/types';

// In-memory SQLite for Jest: the real engine (Node's built-in `node:sqlite`, Node 22.13+), so tests run the same SQL,
// constraints and migrations as the phone. Never import this file from app code: Metro cannot bundle `node:sqlite`.

interface NodeStatement {
  run(...params: SqlValue[]): unknown;
  all(...params: SqlValue[]): unknown[];
  get(...params: SqlValue[]): unknown;
}
interface NodeDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
}

export function createMemoryDb(): Db {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => NodeDatabase };
  const native = new DatabaseSync(':memory:');
  return {
    exec: (sql) => native.exec(sql),
    run: (sql, params = []) => {
      native.prepare(sql).run(...params);
    },
    all: <T>(sql: string, params: SqlValue[] = []) =>
      native
        .prepare(sql)
        .all(...params)
        .map((row) => ({ ...(row as object) }) as T),
    first: <T>(sql: string, params: SqlValue[] = []) => {
      const row = native.prepare(sql).get(...params);
      return row === undefined ? null : ({ ...(row as object) } as T);
    },
    transaction: makeTransaction((sql) => native.exec(sql)),
  };
}
