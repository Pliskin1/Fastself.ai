import type { Reminders, Settings } from '@fastself/core';

export type SqlValue = string | number | null;

/**
 * Synchronous SQL surface the repositories run on.
 * On the device it is expo-sqlite (`src/db/sqlite.ts`); under Jest it is an in-memory SQLite (`src/test/memoryDb.ts`).
 */
export interface Db {
  /** Runs one or more statements without parameters. */
  exec(sql: string): void;
  run(sql: string, params?: SqlValue[]): void;
  all<T>(sql: string, params?: SqlValue[]): T[];
  first<T>(sql: string, params?: SqlValue[]): T | null;
  /** Runs fn in one transaction and rolls back if it throws. Nested calls join the outer transaction. */
  transaction<T>(fn: () => T): T;
}

/**
 * Core settings plus the app-only parts: the onboarding flag and the reminder switches (local only, never synced).
 * It is assignable to core `Settings`.
 */
export type AppSettings = Settings & { onboarded: boolean; reminders: Reminders };
