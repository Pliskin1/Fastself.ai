import type { Db } from './types';

/** Builds `Db.transaction` on top of a statement runner. SQLite has no nested BEGIN, so inner calls join the outer one. */
export function makeTransaction(exec: (sql: string) => void): Db['transaction'] {
  let active = false;
  return function transaction<T>(fn: () => T): T {
    if (active) return fn();
    exec('BEGIN');
    active = true;
    try {
      const result = fn();
      exec('COMMIT');
      return result;
    } catch (error) {
      try {
        exec('ROLLBACK');
      } catch {
        // SQLite already rolled back on its own (for example after a disk error); keep the original error.
      }
      throw error;
    } finally {
      active = false;
    }
  };
}
