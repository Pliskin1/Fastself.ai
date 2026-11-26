import type { SyncTable } from '@/db/outbox';
import { kvGet, kvSet } from '@/db/repo/kv';
import type { Db } from '@/db/types';
import type { SyncGroup } from './tables';

// The sync state of this install, as JSON in kv 'last_sync_at' (the key already exists; KvKey is a closed list).

/** A keyset position: the server's `updated_at` string, kept verbatim (microseconds), and the row id. */
export interface PullMark {
  ts: string;
  id: string;
}

export interface SyncState {
  /** The user the state belongs to. Another user starts from a fresh state. */
  user: string;
  /** Epoch ms of the last run that succeeded, or null. */
  at: number | null;
  /** Groups whose first sync on this install is done. */
  started: SyncGroup[];
  /** One pull mark per table. */
  marks: Partial<Record<SyncTable, PullMark>>;
  /** The profile's server `updated_at` last seen (pulled or returned by our own update). */
  profileMark: string | null;
  /** kv 'settings' `updated_at` that the server already has. Any other value means the profile is unsent. */
  profileSentAt: number;
  /** Server `updated_at` of rows this phone pushed, by `table:id`, to know their echo on the next pull. */
  pushed: Record<string, string>;
}

export function freshState(user: string): SyncState {
  return { user, at: null, started: [], marks: {}, profileMark: null, profileSentAt: 0, pushed: {} };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isMark = (value: unknown): value is PullMark =>
  isRecord(value) && typeof value.ts === 'string' && typeof value.id === 'string';

/** The stored state, or null when there is none or it cannot be read (the next run then starts fresh). */
export function loadState(db: Db): SyncState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(kvGet(db, 'last_sync_at') ?? 'null');
  } catch {
    return null;
  }
  if (!isRecord(raw) || typeof raw.user !== 'string') return null;
  const { at, started, marks, profileMark, profileSentAt, pushed } = raw;
  if (at !== null && typeof at !== 'number') return null;
  if (!Array.isArray(started) || !started.every((group) => typeof group === 'string')) return null;
  if (!isRecord(marks) || !Object.values(marks).every(isMark)) return null;
  if (profileMark !== null && typeof profileMark !== 'string') return null;
  if (typeof profileSentAt !== 'number') return null;
  if (!isRecord(pushed) || !Object.values(pushed).every((stamp) => typeof stamp === 'string')) return null;
  return {
    user: raw.user,
    at,
    started: started as SyncGroup[],
    marks: marks as SyncState['marks'],
    profileMark,
    profileSentAt,
    pushed: pushed as Record<string, string>,
  };
}

export function saveState(db: Db, state: SyncState): void {
  kvSet(db, 'last_sync_at', JSON.stringify(state));
}

/** Forgets what a group has synced, so the next run with its consent uploads everything again. */
export function forgetGroup(state: SyncState, group: SyncGroup, tables: readonly SyncTable[]): void {
  state.started = state.started.filter((g) => g !== group);
  for (const table of tables) {
    delete state.marks[table];
    for (const key of Object.keys(state.pushed)) if (key.startsWith(`${table}:`)) delete state.pushed[key];
  }
  if (group === 'practices') {
    state.profileMark = null;
    state.profileSentAt = 0;
  }
}
