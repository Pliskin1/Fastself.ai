import { RemoteError, type RemoteErrorKind, type ServerProfile, type ServerRow, type SyncRemote } from '../remote';
import type { PullMark } from '../state';
import type { ServerProfileValues, ServerTable } from '../tables';

// Jest only, never imported by app code. It lives outside __tests__ because Jest runs every file there as a suite.
//
// A fake Supabase for the sync tests, behind the same `SyncRemote` interface the engine uses. Like Postgres it stamps
// `updated_at` with the server's own clock (a whole batch gets one stamp, and a payload's `updated_at` is ignored),
// keeps rows per user (row-level security), enforces the checks, the not-null columns and the `day_marks` unique key
// of supabase/migrations/2026112401_init.sql, and fails a batch as a whole. It records every call and payload.

type Row = Record<string, unknown> & { id: string; user_id: string; updated_at: string };

export interface Call {
  op: 'pull' | 'upsert' | 'getProfile' | 'updateProfile' | 'deleteRows';
  user: string;
  table?: ServerTable;
  after?: PullMark | null;
  rows?: Record<string, unknown>[];
  values?: ServerProfileValues;
}

class PgError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const COLUMNS: Record<ServerTable, readonly string[]> = {
  user_practices: ['practice', 'settings', 'active', 'deleted'],
  user_allergies: ['kind', 'code', 'deleted'],
  fasting_sessions: ['started_at', 'ended_at', 'target_hours', 'kind', 'deleted'],
  day_marks: ['day', 'kind', 'deleted'],
  meal_plans: ['week_start', 'rule_pack_version', 'days', 'created_at', 'deleted'],
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isTime = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const isObject = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);

function check(table: ServerTable, row: Row): void {
  const need = (ok: boolean, code: string) => {
    if (!ok) throw new PgError(code);
  };
  const notNull = (...columns: string[]) =>
    columns.forEach((c) => need(row[c] !== null && row[c] !== undefined, '23502'));
  const bool = (...columns: string[]) => columns.forEach((c) => need(typeof row[c] === 'boolean', '22P02'));
  if (table === 'user_practices') {
    notNull('practice', 'settings', 'active', 'deleted');
    need(['orthodox', 'ramadan', 'nafila', 'if'].includes(row.practice as string), '23514');
    need(isObject(row.settings), '22P02');
    bool('active', 'deleted');
  } else if (table === 'user_allergies') {
    notNull('kind', 'code', 'deleted');
    need(['allergen', 'custom', 'diet'].includes(row.kind as string), '23514');
    need(typeof row.code === 'string' && [...(row.code as string)].length <= 40, '23514');
    bool('deleted');
  } else if (table === 'fasting_sessions') {
    notNull('started_at', 'target_hours', 'kind', 'deleted');
    need(isTime(row.started_at) && (row.ended_at === null || isTime(row.ended_at)), '22007');
    need([12, 14, 16].includes(row.target_hours as number), '23514');
    need(['if', 'nafila'].includes(row.kind as string), '23514');
    bool('deleted');
  } else if (table === 'day_marks') {
    notNull('day', 'kind', 'deleted');
    need(DAY.test(row.day as string), '22007');
    need(['exception', 'nafila', 'kaza_done'].includes(row.kind as string), '23514');
    bool('deleted');
  } else {
    notNull('week_start', 'rule_pack_version', 'days', 'created_at', 'deleted');
    need(DAY.test(row.week_start as string) && isTime(row.created_at), '22007');
    bool('deleted');
  }
}

const clone = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T));

export class FakeServer {
  /** The server clock, epoch ms. Each stamp takes the current time, then moves it on by 1 ms. */
  now = Date.parse('2026-11-26T09:00:00.000Z');
  readonly tables: Record<ServerTable, Map<string, Row>> = {
    user_practices: new Map(),
    user_allergies: new Map(),
    fasting_sessions: new Map(),
    day_marks: new Map(),
    meal_plans: new Map(),
  };
  readonly profiles = new Map<string, ServerProfile>();
  readonly calls: Call[] = [];
  private failures: { kind: RemoteErrorKind; op: Call['op'] | undefined }[] = [];
  private down: RemoteErrorKind | null = null;
  private held: Promise<void> | null = null;

  setTime(iso: string): void {
    this.now = Date.parse(iso);
  }

  /** A Postgres-style timestamptz with microseconds, strictly later than every earlier stamp. */
  stamp(): string {
    const iso = new Date(this.now).toISOString();
    this.now += 1;
    return `${iso.slice(0, 23)}456+00:00`;
  }

  /** The next call (of this kind of call, when `op` is given) fails with this kind. */
  failNext(kind: RemoteErrorKind, op?: Call['op']): void {
    this.failures.push({ kind, op });
  }

  /** Every call fails with this kind until `setDown(null)`. */
  setDown(kind: RemoteErrorKind | null): void {
    this.down = kind;
  }

  /** Holds every call until the returned function is called. */
  hold(): () => void {
    let release = () => undefined as void;
    this.held = new Promise<void>((resolve) => {
      release = () => {
        this.held = null;
        resolve();
      };
    });
    return release;
  }

  /** The user's rows of a table, as stored. */
  rows(table: ServerTable, user: string): Row[] {
    return [...this.tables[table].values()].filter((row) => row.user_id === user).map(clone);
  }

  /** The user's rows that are not deleted. */
  live(table: ServerTable, user: string): Row[] {
    return this.rows(table, user).filter((row) => row.deleted !== true);
  }

  /** The user's profile; made on first use, as the sign-up trigger does. */
  profile(user: string): ServerProfile {
    let profile = this.profiles.get(user);
    if (!profile) {
      profile = {
        city: null,
        prayer_method: 'izcg',
        offsets: { fajr: 0, maghrib: 0 },
        ramadan_shift: 0,
        updated_at: this.stamp(),
      };
      this.profiles.set(user, profile);
    }
    return profile;
  }

  /** Writes rows as one batch, without recording a call. */
  seed(user: string, table: ServerTable, rows: Record<string, unknown>[]): string {
    return this.apply(user, table, rows)[0]?.updated_at ?? '';
  }

  upserts(table?: ServerTable): Record<string, unknown>[][] {
    return this.calls.filter((c) => c.op === 'upsert' && (!table || c.table === table)).map((c) => c.rows ?? []);
  }

  private apply(user: string, table: ServerTable, rows: Record<string, unknown>[]): ServerRow[] {
    const stamp = this.stamp();
    const map = this.tables[table];
    const ids = new Set<string>();
    const next: Row[] = [];
    for (const input of rows) {
      for (const key of Object.keys(input)) {
        if (key !== 'id' && key !== 'user_id' && !COLUMNS[table].includes(key)) throw new PgError('PGRST204');
      }
      const id = input.id;
      if (typeof id !== 'string') throw new PgError('23502');
      if (ids.has(id)) throw new PgError('21000');
      ids.add(id);
      if (input.user_id !== user) throw new PgError('42501');
      const existing = map.get(id);
      if (existing && existing.user_id !== user) throw new PgError('42501');
      const defaults: Record<string, unknown> =
        table === 'meal_plans' ? { deleted: false, created_at: new Date(this.now).toISOString() } : { deleted: false };
      if (table === 'user_practices') Object.assign(defaults, { settings: {}, active: true });
      if (table === 'fasting_sessions') Object.assign(defaults, { ended_at: null, kind: 'if' });
      const row = { ...defaults, ...existing, ...clone(input), user_id: user, updated_at: stamp } as Row;
      check(table, row);
      next.push(row);
    }
    if (table === 'day_marks') {
      const keyOf = (row: Row) => `${row.user_id}|${row.day as string}|${row.kind as string}`;
      const taken = new Map<string, string>();
      for (const row of map.values()) if (!ids.has(row.id)) taken.set(keyOf(row), row.id);
      for (const row of next) {
        if (taken.has(keyOf(row))) throw new PgError('23505');
        taken.set(keyOf(row), row.id);
      }
    }
    for (const row of next) map.set(row.id, row);
    return next.map((row) => ({ id: row.id, updated_at: stamp }));
  }

  /** The remote as the given user sees it. */
  remote(user: string): SyncRemote {
    const call = async <T>(entry: Call, fn: () => T): Promise<T> => {
      this.calls.push(clone(entry));
      while (this.held) await this.held;
      const index = this.failures.findIndex((f) => !f.op || f.op === entry.op);
      const failure = index >= 0 ? this.failures.splice(index, 1)[0]?.kind : this.down;
      if (failure) throw new RemoteError(failure);
      try {
        return clone(fn());
      } catch (e) {
        if (!(e instanceof PgError)) throw e;
        const refused = e.code.startsWith('23') || e.code === '42501';
        throw new RemoteError(refused ? 'refused' : 'server', e.code);
      }
    };

    return {
      pull: (table, after, limit) =>
        call({ op: 'pull', user, table, after }, () =>
          this.rows(table, user)
            .sort((a, b) =>
              a.updated_at === b.updated_at ? (a.id < b.id ? -1 : 1) : a.updated_at < b.updated_at ? -1 : 1,
            )
            .filter((row) => !after || row.updated_at > after.ts || (row.updated_at === after.ts && row.id > after.id))
            .slice(0, limit),
        ),
      upsert: (table, rows) => call({ op: 'upsert', user, table, rows }, () => this.apply(user, table, rows)),
      getProfile: () => call({ op: 'getProfile', user }, () => this.profile(user)),
      updateProfile: (values) =>
        call({ op: 'updateProfile', user, values }, () => {
          if (![-1, 0, 1].includes(values.ramadan_shift)) throw new PgError('23514');
          const profile = { ...this.profile(user), ...clone(values), updated_at: this.stamp() };
          this.profiles.set(user, profile);
          return profile.updated_at;
        }),
      deleteRows: (table) =>
        call({ op: 'deleteRows', user, table }, () => {
          for (const row of this.rows(table, user)) this.tables[table].delete(row.id);
        }),
    };
  }
}
