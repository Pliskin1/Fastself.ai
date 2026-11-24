import { openDatabaseSync } from 'expo-sqlite';
import { makeTransaction } from './tx';
import type { Db } from './types';

/** The on-device database: expo-sqlite, synchronous API, WAL. */
export function openDeviceDb(name = 'fastself.db'): Db {
  const native = openDatabaseSync(name);
  native.execSync('PRAGMA journal_mode = WAL');
  return {
    exec: (sql) => native.execSync(sql),
    run: (sql, params = []) => {
      native.runSync(sql, params);
    },
    all: <T>(sql: string, params: (string | number | null)[] = []) => native.getAllSync<T>(sql, params),
    first: <T>(sql: string, params: (string | number | null)[] = []) => native.getFirstSync<T>(sql, params),
    transaction: makeTransaction((sql) => native.execSync(sql)),
  };
}
