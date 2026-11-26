import type { SyncTable } from '@/db/outbox';
import type { Db } from '@/db/types';
import { stableId } from './ids';
import { RemoteError, type ServerRow, type Stamp, type SyncRemote } from './remote';
import { forgetGroup, freshState, loadState, saveState, type SyncState } from './state';
import {
  EMPTY_PROFILE,
  SYNC_GROUPS,
  TABLES,
  naturalKeyOf,
  profileFromServer,
  profileToServer,
  sameProfile,
  sameValues,
  serverMs,
  tablesOf,
  type LocalValues,
  type SyncGroup,
  type TableSpec,
} from './tables';

/*
 * The sync protocol as built (T18). docs/DATABASE.md §4 is behind it in the two places marked "DEPARTS".
 *
 * Data: five local tables mirror five server tables (tables.ts), each in one consent group: practices (+ the profile
 * in kv 'settings' <-> `profiles`), allergies, history (sessions, day marks, meal plans). Writers queue changed rows
 * in `outbox` (db/outbox.ts) only while a user is signed in and the table's consent is on. The engine writes with
 * direct SQL, never through the repos, so nothing it writes is queued. The sync state lives in kv 'last_sync_at'
 * (state.ts).
 *
 * Ids: DEPARTS from §1 ("uuid v4"). Practices, allergies and day marks get a fixed id, uuid v5 of
 * `${userId}:${table}:${naturalKey}` (ids.ts), so the same row made on two phones is one server row: the server's
 * unique key on day_marks, the local UNIQUE(kind, code) on allergies and one row per practice all hold. Sessions and
 * meal plans keep random ids.
 *
 * One run (`run()`):
 *  0. State: another user than the stored one starts a fresh state and empties the outbox. Outbox entries of tables
 *     whose consent is off are dropped.
 *  1. First sync of a group on this install: its rows are renamed to their fixed ids, every live row is queued and
 *     the profile counts as unsent. Its marks are empty, so step 2 pulls everything. Then it is a normal run.
 *  2. Pull. DEPARTS from §4 (push then pull since one `last_sync_at`): pull comes first, so a conflict is seen before
 *     anything is overwritten, and each table has its own mark. Keyset pages of 500 in (`updated_at`, `id`) order
 *     after the stored mark; the mark is the server's timestamp string kept verbatim. A row is matched by id, then
 *     by natural key (the local row then takes the server id). A row whose stamp equals the one this phone got when
 *     it pushed it is our own echo. Otherwise, with no outbox entry the server version is written; with one, the
 *     later `updated_at` wins (D-11): server later, it is written and the entry dropped; local later, it stays queued.
 *     The profile follows the same rule with kv 'settings' `updated_at`; a server profile with no city never wins.
 *  3. Push. The outbox is read up to its highest seq, one entry per row; natural-key rows get their fixed id; rows go
 *     up per table in upserts of 100 with no `updated_at` (the server stamps it) and no `reason`. The returned
 *     stamps are kept for step 2's echo check. A refused chunk is sent row by row and a row refused alone leaves the
 *     queue (it stays on the phone). `offline` and `server` stop the run and keep the queue. Entries are deleted
 *     only up to the seq read at the start, so an edit made during the push stays queued.
 *
 * Known limits: the server stamps a row when it arrives, so of two offline edits the later upload wins. Rows edited
 * while signed out or while a consent was off are sent the next time they are edited.
 */

const PAGE = 500;
const CHUNK = 100;

export interface EngineOptions {
  db: Db;
  remote: SyncRemote;
  userId: string;
  /** The consented groups; tables of the other groups are neither pulled nor pushed. */
  groups: readonly SyncGroup[];
  /**
   * Called once when the pull ends, also when it or the push after it fails: what the pull wrote is in SQLite by
   * then, so whoever caches local rows (the settings store) must read them again before the next local write.
   */
  onPulled?: (result: RunResult) => void;
}

export interface RunResult {
  /** A pull changed practices, allergies, day marks or the profile: the settings store must be read again. */
  settingsChanged: boolean;
  /** A pull changed rows of any table. */
  rowsChanged: boolean;
}

type LocalRow = LocalValues & { id: string; updated_at: number };

interface SettingsKv {
  value: string;
  updated_at: number;
}

export function createEngine(options: EngineOptions): { run(): Promise<RunResult> } {
  const { db, remote, userId } = options;
  const groups = SYNC_GROUPS.filter((group) => options.groups.includes(group));
  const specs = TABLES.filter((spec) => groups.includes(spec.group));

  // --- Local rows ---------------------------------------------------------------------------------------------

  const selectFrom = (spec: TableSpec): string =>
    `SELECT id, updated_at, ${spec.columns.join(', ')} FROM ${spec.local}`;
  const byId = (spec: TableSpec, id: string): LocalRow | null =>
    db.first<LocalRow>(`${selectFrom(spec)} WHERE id = ?`, [id]);

  /** The local row holding the natural key of these values; the newest live one when there are several. */
  function byKey(spec: TableSpec, values: LocalValues): LocalRow | null {
    const columns = spec.naturalKey ?? [];
    if (columns.length === 0) return null;
    return db.first<LocalRow>(
      `${selectFrom(spec)} WHERE ${columns.map((c) => `${c} = ?`).join(' AND ')} ` +
        'ORDER BY deleted ASC, updated_at DESC, id DESC LIMIT 1',
      columns.map((c) => values[c] ?? null),
    );
  }

  const isQueued = (table: SyncTable, id: string): boolean =>
    db.first<{ seq: number }>('SELECT seq FROM outbox WHERE tbl = ? AND row_id = ? LIMIT 1', [table, id]) !== null;

  const readSettingsKv = (): SettingsKv | null =>
    db.first<SettingsKv>("SELECT value, updated_at FROM kv WHERE key = 'settings'");

  function rename(table: SyncTable, from: string, to: string, state: SyncState): void {
    db.run(`UPDATE ${table} SET id = ? WHERE id = ?`, [to, from]);
    db.run('UPDATE outbox SET row_id = ? WHERE tbl = ? AND row_id = ?', [to, table, from]);
    delete state.pushed[`${table}:${from}`];
  }

  /** Practices has no local UNIQUE: keeps the newest live row of each practice and moves the others' entries to it. */
  function dedupePractices(): void {
    const rows = db.all<{ id: string; practice: string }>(
      'SELECT id, practice FROM practices ORDER BY practice, deleted ASC, updated_at DESC, id DESC',
    );
    const kept = new Map<string, string>();
    for (const row of rows) {
      const keep = kept.get(row.practice);
      if (keep === undefined) {
        kept.set(row.practice, row.id);
        continue;
      }
      db.run("UPDATE outbox SET row_id = ? WHERE tbl = 'practices' AND row_id = ?", [keep, row.id]);
      db.run('DELETE FROM practices WHERE id = ?', [row.id]);
    }
  }

  /** Gives natural-key rows their fixed id: every row, or only the given ids. */
  function toStable(spec: TableSpec, state: SyncState, only?: ReadonlySet<string>): void {
    if (!spec.naturalKey) return;
    if (spec.local === 'practices') dedupePractices();
    for (const row of db.all<LocalRow>(selectFrom(spec))) {
      if (only && !only.has(row.id)) continue;
      const key = naturalKeyOf(spec, row);
      if (key === null) continue;
      const id = stableId(userId, spec.local, key);
      // A row already holding the fixed id would be the same key twice, which the dedupe and UNIQUE rule out.
      if (id !== row.id && !byId(spec, id)) rename(spec.local, row.id, id, state);
    }
  }

  function write(spec: TableSpec, exists: boolean, id: string, values: LocalValues, updatedAt: number): void {
    const params = spec.columns.map((c) => values[c] ?? null);
    if (exists) {
      db.run(
        `UPDATE ${spec.local} SET ${spec.columns.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
        [...params, updatedAt, id],
      );
    } else {
      db.run(
        `INSERT INTO ${spec.local} (id, ${spec.columns.join(', ')}, updated_at) ` +
          `VALUES (?, ${spec.columns.map(() => '?').join(', ')}, ?)`,
        [id, ...params, updatedAt],
      );
    }
  }

  // --- 0 and 1: state and first sync --------------------------------------------------------------------------

  function startGroup(state: SyncState, group: SyncGroup): void {
    const now = Date.now();
    const groupSpecs = tablesOf(group);
    forgetGroup(
      state,
      group,
      groupSpecs.map((spec) => spec.local),
    );
    for (const spec of groupSpecs) {
      toStable(spec, state);
      db.run(
        `INSERT INTO outbox (tbl, row_id, op, created_at) SELECT ?, id, 'upsert', ? FROM ${spec.local} ` +
          'WHERE deleted = 0 ORDER BY updated_at, id',
        [spec.local, now],
      );
    }
    state.started.push(group);
  }

  function prepare(): SyncState {
    return db.transaction(() => {
      let state = loadState(db);
      if (!state || state.user !== userId) {
        state = freshState(userId);
        db.run('DELETE FROM outbox');
      }
      const tables = specs.map((spec) => spec.local);
      if (tables.length > 0) {
        db.run(`DELETE FROM outbox WHERE tbl NOT IN (${tables.map(() => '?').join(', ')})`, tables);
      } else {
        db.run('DELETE FROM outbox');
      }
      for (const group of groups) if (!state.started.includes(group)) startGroup(state, group);
      saveState(db, state);
      return state;
    });
  }

  // --- 2: pull ------------------------------------------------------------------------------------------------

  function applyRow(spec: TableSpec, row: ServerRow, state: SyncState, result: RunResult): void {
    const pushedKey = `${spec.local}:${row.id}`;
    const pushed = state.pushed[pushedKey];
    delete state.pushed[pushedKey];
    const values = spec.fromServer(row);
    const serverAt = serverMs(row.updated_at);
    if (!values || serverAt === null) return; // fails the local checks: skipped, the mark still moves on

    let local = byId(spec, row.id);
    if (spec.naturalKey) {
      const holder = byKey(spec, values);
      if (!local && holder) {
        rename(spec.local, holder.id, row.id, state);
        local = { ...holder, id: row.id };
      } else if (local && holder && holder.id !== row.id && spec.uniqueKey) {
        return; // another local row holds the key this row moves to; writing it would break the UNIQUE key
      }
    }

    if (local && pushed === row.updated_at) return; // our own push coming back
    if (local && isQueued(spec.local, row.id)) {
      if (serverAt <= local.updated_at) return; // the local change is later: it stays queued and step 3 sends it
      db.run('DELETE FROM outbox WHERE tbl = ? AND row_id = ?', [spec.local, row.id]);
    }
    if (local && sameValues(spec, local, values)) return;

    write(spec, local !== null, row.id, values, serverAt);
    if (local || values.deleted === 0) {
      result.rowsChanged = true;
      if (spec.settings) result.settingsChanged = true;
    }
  }

  async function pullTable(spec: TableSpec, state: SyncState, result: RunResult): Promise<void> {
    for (;;) {
      const page = await remote.pull(spec.server, state.marks[spec.local] ?? null, PAGE);
      const last = page[page.length - 1];
      if (!last) return;
      db.transaction(() => {
        for (const row of page) applyRow(spec, row, state, result);
        state.marks[spec.local] = { ts: last.updated_at, id: last.id };
        saveState(db, state);
      });
      if (page.length < PAGE) return;
    }
  }

  async function pullProfile(state: SyncState, result: RunResult): Promise<void> {
    const server = await remote.getProfile();
    if (!server || server.updated_at === state.profileMark) return;
    db.transaction(() => {
      const profile = profileFromServer(server);
      const kv = readSettingsKv();
      const serverAt = serverMs(server.updated_at) ?? 0;
      if (profile && (!kv || kv.updated_at === state.profileSentAt || serverAt > kv.updated_at)) {
        if (sameProfile(kv?.value ?? null, profile)) {
          if (kv) state.profileSentAt = kv.updated_at;
        } else {
          const now = Date.now();
          db.run(
            'INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ' +
              'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
            ['settings', JSON.stringify(profile), now],
          );
          state.profileSentAt = now;
          result.settingsChanged = true;
        }
      }
      state.profileMark = server.updated_at;
      saveState(db, state);
    });
  }

  // --- 3: push ------------------------------------------------------------------------------------------------

  function done(spec: TableSpec, ids: readonly string[], stamps: readonly Stamp[], maxSeq: number, state: SyncState) {
    db.transaction(() => {
      for (const stamp of stamps) state.pushed[`${spec.local}:${stamp.id}`] = stamp.updated_at;
      for (const id of ids) {
        db.run('DELETE FROM outbox WHERE tbl = ? AND row_id = ? AND seq <= ?', [spec.local, id, maxSeq]);
      }
      saveState(db, state);
    });
  }

  async function send(
    spec: TableSpec,
    items: readonly { id: string; payload: Record<string, unknown> }[],
    maxSeq: number,
    state: SyncState,
  ): Promise<void> {
    try {
      const stamps = await remote.upsert(
        spec.server,
        items.map((item) => item.payload),
      );
      done(
        spec,
        items.map((item) => item.id),
        stamps,
        maxSeq,
        state,
      );
    } catch (error) {
      if (!(error instanceof RemoteError) || error.kind !== 'refused') throw error;
      if (items.length === 1) {
        done(
          spec,
          items.map((item) => item.id),
          [],
          maxSeq,
          state,
        );
        return;
      }
      for (const item of items) await send(spec, [item], maxSeq, state);
    }
  }

  async function pushRows(state: SyncState): Promise<void> {
    const maxSeq = db.first<{ seq: number | null }>('SELECT MAX(seq) AS seq FROM outbox')?.seq ?? null;
    if (maxSeq === null) return;
    const queuedIds = (spec: TableSpec): string[] =>
      db
        .all<{ row_id: string }>(
          'SELECT row_id FROM outbox WHERE tbl = ? AND seq <= ? GROUP BY row_id ORDER BY MIN(seq)',
          [spec.local, maxSeq],
        )
        .map((entry) => entry.row_id);

    db.transaction(() => {
      for (const spec of specs) {
        const ids = new Set(queuedIds(spec));
        if (spec.naturalKey && ids.size > 0) toStable(spec, state, ids);
      }
      saveState(db, state);
    });

    for (const spec of specs) {
      const ids = queuedIds(spec);
      for (let i = 0; i < ids.length; i += CHUNK) {
        const items: { id: string; payload: Record<string, unknown> }[] = [];
        const gone: string[] = [];
        for (const id of ids.slice(i, i + CHUNK)) {
          const row = byId(spec, id);
          if (row) items.push({ id, payload: { ...spec.toServer(row), id, user_id: userId } });
          else gone.push(id);
        }
        if (gone.length > 0) done(spec, gone, [], maxSeq, state);
        if (items.length > 0) await send(spec, items, maxSeq, state);
      }
    }
  }

  async function pushProfile(state: SyncState): Promise<void> {
    const kv = readSettingsKv();
    if (!kv || kv.updated_at === state.profileSentAt) return;
    try {
      state.profileMark = await remote.updateProfile(profileToServer(kv.value));
    } catch (error) {
      if (!(error instanceof RemoteError) || error.kind !== 'refused') throw error;
    }
    state.profileSentAt = kv.updated_at;
    saveState(db, state);
  }

  // --- The run ------------------------------------------------------------------------------------------------

  async function run(): Promise<RunResult> {
    const result: RunResult = { settingsChanged: false, rowsChanged: false };
    const state = prepare();
    try {
      for (const spec of specs) await pullTable(spec, state, result);
      if (groups.includes('practices')) await pullProfile(state, result);
    } finally {
      options.onPulled?.(result);
    }
    await pushRows(state);
    if (groups.includes('practices')) await pushProfile(state);
    state.at = Date.now();
    saveState(db, state);
    return result;
  }

  return { run };
}

/**
 * Deletes the user's server rows of these groups. For practices the profile columns go back to their defaults and
 * the `profiles` row stays (every other table hangs off it). The groups' marks and first-sync flags are forgotten,
 * so turning the consent on again uploads everything.
 */
export async function deleteServerGroups(
  options: Pick<EngineOptions, 'db' | 'remote' | 'userId'>,
  kinds: readonly SyncGroup[],
): Promise<void> {
  const { db, remote, userId } = options;
  for (const group of SYNC_GROUPS.filter((g) => kinds.includes(g))) {
    const tables = tablesOf(group);
    for (const spec of tables) await remote.deleteRows(spec.server);
    if (group === 'practices') await remote.updateProfile(EMPTY_PROFILE);
    db.transaction(() => {
      const state = loadState(db);
      const locals = tables.map((spec) => spec.local);
      if (state && state.user === userId) {
        forgetGroup(state, group, locals);
        saveState(db, state);
      }
      db.run(`DELETE FROM outbox WHERE tbl IN (${locals.map(() => '?').join(', ')})`, locals);
    });
  }
}
