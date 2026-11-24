import { getSettings, updateSettings } from '@/store/settings';
import { getDb } from '../index';

export type SafetyKey = 'preg' | 'diab' | 'ed' | 'minor';

/** Answers of the onboarding safety step. They live only in the local `safety` table and are never synced or sent. */
export const safety = {
  set(key: SafetyKey, on: boolean): void {
    // `minor` is also Settings.minor (it blocks IF), so it goes through the store to keep both in step.
    if (key === 'minor') return updateSettings({ minor: on });
    getDb().run('INSERT INTO safety (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
      key,
      on ? 1 : 0,
    ]);
  },

  get(key: SafetyKey): boolean {
    if (key === 'minor') return getSettings().minor;
    return getDb().first<{ value: number }>('SELECT value FROM safety WHERE key = ?', [key])?.value === 1;
  },

  all(): Record<SafetyKey, boolean> {
    return { preg: safety.get('preg'), diab: safety.get('diab'), ed: safety.get('ed'), minor: safety.get('minor') };
  },
};
