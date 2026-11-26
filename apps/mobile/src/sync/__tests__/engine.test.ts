import { toDayNum } from '@fastself/core';
import { setIdGenerator } from '@/db/ids';
import { migrate } from '@/db/migrations';
import { enqueue } from '@/db/outbox';
import { kvGet, kvSet } from '@/db/repo/kv';
import { loadSettings, saveSettings } from '@/db/repo/settings';
import type { AppSettings, Db } from '@/db/types';
import { createMemoryDb } from '@/test/memoryDb';
import { createEngine, deleteServerGroups } from '../engine';
import { stableId } from '../ids';
import { RemoteError } from '../remote';
import { loadState } from '../state';
import type { SyncGroup } from '../tables';
import { FakeServer } from '../testing/fakeServer';

// Two phones are two in-memory SQLite databases with the real schema; the server is one FakeServer.

const U = '3f0c9a52-7d1e-4b6a-8c2f-1e5d7a9b0c43';
const V = '8a1b2c3d-4e5f-4a6b-9c7d-0e1f2a3b4c5d';
const ALL: SyncGroup[] = ['practices', 'allergies', 'history'];
const CONSENT = {
  practices: 'consent_sync_practices',
  allergies: 'consent_sync_allergies',
  history: 'consent_sync_history',
} as const;
const DEC_2 = toDayNum(2026, 12, 2);

let server: FakeServer;

/** The phone clock (Date.now), which every local `updated_at` comes from. */
const setPhoneTime = (iso: string) => jest.spyOn(Date, 'now').mockReturnValue(Date.parse(iso));
/** Both clocks at once. */
const setTime = (iso: string) => {
  setPhoneTime(iso);
  server.setTime(iso);
};

function signIn(db: Db, user = U, groups: readonly SyncGroup[] = ALL): void {
  kvSet(db, 'auth_user_id', user);
  for (const group of groups) kvSet(db, CONSENT[group], '1');
}

function phone(options: { signedIn?: boolean } = {}): Db {
  const db = createMemoryDb();
  migrate(db);
  if (options.signedIn !== false) signIn(db);
  return db;
}

/** A settings change made in the app, through the real repo. */
function edit(db: Db, change: (s: AppSettings) => Partial<AppSettings>): void {
  const prev = loadSettings(db);
  saveSettings(db, prev, { ...prev, ...change(prev) });
}

const orthodox = (s: AppSettings) => ({ ...s.practices, orthodox: true });

function addSession(db: Db, startedAt: number, endedAt: number | null = null): string {
  const id = globalThis.crypto.randomUUID();
  db.run(
    'INSERT INTO fasting_sessions (id, started_at, ended_at, target_hours, kind, updated_at) VALUES (?, ?, ?, 16, ?, ?)',
    [id, startedAt, endedAt, 'if', Date.now()],
  );
  enqueue(db, 'fasting_sessions', id);
  return id;
}

const run = (db: Db, groups: readonly SyncGroup[] = ALL, user = U) =>
  createEngine({ db, remote: server.remote(user), userId: user, groups }).run();

const outbox = (db: Db) => db.all<{ tbl: string; row_id: string }>('SELECT tbl, row_id FROM outbox ORDER BY seq');
const count = (db: Db, table: string) => db.first<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`)?.n;
const sorted = (list: readonly string[]) => [...list].sort();
const upsertCalls = (user = U) => server.calls.filter((c) => c.op === 'upsert' && c.user === user).length;

beforeAll(() => setIdGenerator(() => globalThis.crypto.randomUUID()));

beforeEach(() => {
  server = new FakeServer();
  setTime('2026-11-26T09:00:00Z');
});

afterEach(() => jest.restoreAllMocks());

describe('first sync', () => {
  it('uploads what a guest picked at the first sync of a new account, with fixed ids', async () => {
    const a = phone({ signedIn: false });
    edit(a, (s) => ({
      practices: { ...orthodox(s), ifOn: true },
      strictness: 'riba',
      slavaId: 'nikola',
      ifPlan: 14,
      allergies: ['gluten'],
      customAvoid: ['ćevapi'],
      diets: { ...s.diets, halal: true },
      exceptions: { [DEC_2]: 'zdravlje' },
      city: 'bar',
      offsets: { fajr: -2, maghrib: 3 },
    }));
    const session = addSession(a, Date.parse('2026-11-25T20:00:00Z'), Date.parse('2026-11-26T08:00:00Z'));
    expect(outbox(a)).toEqual([]); // a guest queues nothing

    signIn(a);
    await run(a);

    const practices = server.live('user_practices', U);
    expect(practices.map((r) => r.id).sort()).toEqual(
      sorted([stableId(U, 'practices', 'orthodox'), stableId(U, 'practices', 'if')]),
    );
    expect(practices.find((r) => r.practice === 'orthodox')).toMatchObject({
      active: true,
      settings: { strictness: 'riba', slavaId: 'nikola' },
    });
    expect(practices.find((r) => r.practice === 'if')?.settings).toEqual({ ifPlan: 14 });
    expect(
      server
        .live('user_allergies', U)
        .map((r) => r.id)
        .sort(),
    ).toEqual(
      sorted([
        stableId(U, 'allergies', 'allergen:gluten'),
        stableId(U, 'allergies', 'custom:ćevapi'),
        stableId(U, 'allergies', 'diet:halal'),
      ]),
    );
    expect(server.live('day_marks', U)).toEqual([
      expect.objectContaining({ id: stableId(U, 'day_marks', '2026-12-02:exception'), day: '2026-12-02' }),
    ]);
    expect(server.live('fasting_sessions', U)).toEqual([
      expect.objectContaining({
        id: session,
        started_at: '2026-11-25T20:00:00.000Z',
        ended_at: '2026-11-26T08:00:00.000Z',
        target_hours: 16,
      }),
    ]);
    expect(server.profiles.get(U)).toMatchObject({
      city: 'bar',
      prayer_method: 'izcg',
      offsets: { fajr: -2, maghrib: 3 },
      ramadan_shift: 0,
    });
    expect(outbox(a)).toEqual([]);
    // The local rows took the fixed ids too.
    expect(a.first("SELECT id FROM practices WHERE practice = 'orthodox'")).toEqual({
      id: stableId(U, 'practices', 'orthodox'),
    });
  });

  it('restores rows and the profile on an empty install, and loadSettings returns them', async () => {
    const a = phone();
    edit(a, (s) => ({
      practices: { ...orthodox(s), ramadan: true },
      strictness: 'ulje',
      slavaId: 'jovan',
      allergies: ['jaja', 'gluten'],
      customAvoid: ['kivi'],
      diets: { ...s.diets, vegan: true },
      exceptions: { [DEC_2]: 'putovanje' },
      nafilaDays: { [DEC_2 + 1]: true },
      city: 'rozaje',
      prayerMethod: 'turkey',
      ramadanShift: 1,
    }));
    const session = addSession(a, Date.parse('2026-11-26T06:00:00Z'));
    await run(a);

    const b = phone();
    const result = await run(b);
    expect(result).toEqual({ settingsChanged: true, rowsChanged: true });

    const was = loadSettings(a);
    const got = loadSettings(b);
    expect(got.practices).toEqual(was.practices);
    expect([got.strictness, got.slavaId]).toEqual(['ulje', 'jovan']);
    expect(sorted(got.allergies)).toEqual(['gluten', 'jaja']);
    expect(got.customAvoid).toEqual(['kivi']);
    expect(got.diets).toEqual(was.diets);
    expect(got.nafilaDays).toEqual({ [DEC_2 + 1]: true });
    expect(got.exceptions).toEqual({ [DEC_2]: 'drugo' }); // the reason never left phone A
    expect([got.city, got.prayerMethod, got.ramadanShift]).toEqual(['rozaje', 'turkey', 1]);
    expect(b.first('SELECT id, started_at, ended_at FROM fasting_sessions')).toEqual({
      id: session,
      started_at: Date.parse('2026-11-26T06:00:00Z'),
      ended_at: null,
    });
  });

  it('merges data on both sides: the later write wins per row, local-only rows go up, server-only rows come down', async () => {
    const a = phone();
    setTime('2026-11-26T10:00:00Z');
    edit(a, (s) => ({
      practices: { ...orthodox(s), ifOn: true },
      strictness: 'riba',
      ifPlan: 16,
      allergies: ['gluten'],
      city: 'bar',
    }));
    const fromA = addSession(a, Date.parse('2026-11-25T18:00:00Z'), Date.parse('2026-11-26T08:00:00Z'));
    await run(a); // the server holds A's rows from 10:00

    const b = phone({ signedIn: false });
    setPhoneTime('2026-11-26T09:00:00Z'); // older than the server: loses
    edit(b, (s) => ({ practices: { ...s.practices, ifOn: true }, ifPlan: 12, city: 'niksic' }));
    setPhoneTime('2026-11-26T11:00:00Z'); // newer than the server: wins
    edit(b, (s) => ({ practices: orthodox(s), strictness: 'ulje', allergies: ['jaja'] }));
    const fromB = addSession(b, Date.parse('2026-11-26T07:00:00Z'));

    setTime('2026-11-26T11:30:00Z');
    signIn(b);
    await run(b);

    const got = loadSettings(b);
    expect([got.practices.orthodox, got.strictness]).toEqual([true, 'ulje']);
    expect([got.practices.ifOn, got.ifPlan]).toEqual([true, 16]);
    expect(sorted(got.allergies)).toEqual(['gluten', 'jaja']);
    expect(got.city).toBe('bar');
    expect(
      b
        .all<{ id: string }>('SELECT id FROM fasting_sessions')
        .map((r) => r.id)
        .sort(),
    ).toEqual(sorted([fromA, fromB]));

    expect(server.live('user_practices', U).find((r) => r.practice === 'orthodox')?.settings).toEqual({
      strictness: 'ulje',
      slavaId: null,
    });
    expect(server.live('user_practices', U).find((r) => r.practice === 'if')?.settings).toEqual({ ifPlan: 16 });
    expect(
      server
        .live('user_allergies', U)
        .map((r) => r.code)
        .sort(),
    ).toEqual(['gluten', 'jaja']);
    expect(server.live('fasting_sessions', U)).toHaveLength(2);
    expect(server.profiles.get(U)?.city).toBe('bar');
    expect(outbox(b)).toEqual([]);

    await run(a);
    expect(loadSettings(a).strictness).toBe('ulje');
    expect(sorted(loadSettings(a).allergies)).toEqual(['gluten', 'jaja']);
  });

  it('keeps one local row per practice and uploads only that one', async () => {
    const a = phone({ signedIn: false });
    a.run(
      "INSERT INTO practices (id, practice, active, settings, updated_at) VALUES ('old', 'orthodox', 1, '{\"strictness\":\"voda\"}', 1)",
    );
    a.run(
      "INSERT INTO practices (id, practice, active, settings, updated_at) VALUES ('new', 'orthodox', 1, '{\"strictness\":\"riba\"}', 2)",
    );
    signIn(a);
    await run(a);
    expect(a.all('SELECT id FROM practices')).toEqual([{ id: stableId(U, 'practices', 'orthodox') }]);
    expect(server.live('user_practices', U)).toEqual([
      expect.objectContaining({ id: stableId(U, 'practices', 'orthodox'), settings: { strictness: 'riba' } }),
    ]);
  });

  it('merges the phone into another account that signs in on it, and empties the old queue', async () => {
    const a = phone();
    edit(a, () => ({ allergies: ['gluten'] }));
    await run(a);
    kvSet(a, 'auth_user_id', V);
    edit(a, () => ({ allergies: ['gluten', 'jaja'] }));
    await run(a, ALL, V);
    expect(
      server
        .live('user_allergies', V)
        .map((r) => r.id)
        .sort(),
    ).toEqual(sorted([stableId(V, 'allergies', 'allergen:gluten'), stableId(V, 'allergies', 'allergen:jaja')]));
    expect(server.live('user_allergies', U)).toHaveLength(1);
    expect(loadState(a)?.user).toBe(V);
  });
});

describe('pull and push', () => {
  it('shows a change and a delete made on phone A on phone B after its run', async () => {
    const a = phone();
    const b = phone();
    edit(a, (s) => ({ practices: orthodox(s), strictness: 'voda', allergies: ['gluten', 'jaja'] }));
    const session = addSession(a, Date.parse('2026-11-26T06:00:00Z'));
    await run(a);
    await run(b);
    expect(sorted(loadSettings(b).allergies)).toEqual(['gluten', 'jaja']);

    setTime('2026-11-26T10:00:00Z');
    edit(a, () => ({ strictness: 'ulje', allergies: ['jaja'] }));
    a.run('UPDATE fasting_sessions SET ended_at = ?, updated_at = ? WHERE id = ?', [Date.now(), Date.now(), session]);
    enqueue(a, 'fasting_sessions', session);
    await run(a);
    const result = await run(b);

    expect(result).toEqual({ settingsChanged: true, rowsChanged: true });
    expect(loadSettings(b).strictness).toBe('ulje');
    expect(loadSettings(b).allergies).toEqual(['jaja']);
    expect(b.first("SELECT deleted FROM allergies WHERE code = 'gluten'")).toEqual({ deleted: 1 });
    expect(b.first('SELECT ended_at FROM fasting_sessions')).toEqual({ ended_at: Date.parse('2026-11-26T10:00:00Z') });
  });

  it('pulls a row made offline with an old phone time, which a pull by updated_at would miss', async () => {
    const a = phone();
    const b = phone();
    edit(a, () => ({ allergies: ['gluten'] }));
    await run(a);
    await run(b);

    setPhoneTime('2026-11-26T06:00:00Z'); // A's clock is three hours behind, and A is offline
    server.setTime('2026-11-26T10:00:00Z');
    const session = addSession(a, Date.now());
    edit(a, () => ({ customAvoid: ['kivi'] }));
    server.failNext('offline');
    await expect(run(a)).rejects.toThrow(RemoteError);

    server.setTime('2026-11-26T11:00:00Z');
    await run(b); // B is past 11:00 now
    server.setTime('2026-11-26T12:00:00Z');
    await run(a); // A comes back online
    await run(b);

    expect(b.first('SELECT id FROM fasting_sessions')).toEqual({ id: session });
    expect(loadSettings(b).customAvoid).toEqual(['kivi']);
  });

  it('ends with one server row for the same practice, allergy and day mark made on both phones', async () => {
    const a = phone();
    const b = phone();
    await run(a);
    await run(b);
    for (const db of [a, b]) {
      edit(db, (s) => ({
        practices: orthodox(s),
        strictness: 'ulje',
        customAvoid: ['kivi'],
        exceptions: { [DEC_2]: 'putovanje' },
      }));
    }
    await run(a);
    await run(b);
    await run(a);

    expect(server.rows('user_practices', U).map((r) => r.id)).toEqual([stableId(U, 'practices', 'orthodox')]);
    expect(server.rows('user_allergies', U).map((r) => r.id)).toEqual([stableId(U, 'allergies', 'custom:kivi')]);
    expect(server.rows('day_marks', U).map((r) => r.id)).toEqual([stableId(U, 'day_marks', '2026-12-02:exception')]);
    for (const db of [a, b]) {
      expect([count(db, 'practices'), count(db, 'allergies'), count(db, 'day_marks')]).toEqual([1, 1, 1]);
      expect(outbox(db)).toEqual([]);
    }
  });

  it('drops an unsent local change older than the server row, and pushes one that is newer', async () => {
    const a = phone();
    const b = phone();
    edit(a, (s) => ({ practices: orthodox(s), strictness: 'voda' }));
    await run(a);
    await run(b);

    // Older: B changes at 10:00 without syncing, A changes at 11:00 and syncs.
    setPhoneTime('2026-11-26T10:00:00Z');
    edit(b, () => ({ strictness: 'ulje' }));
    setTime('2026-11-26T11:00:00Z');
    edit(a, () => ({ strictness: 'riba' }));
    await run(a);
    const before = upsertCalls();
    setTime('2026-11-26T11:30:00Z');
    await run(b);
    expect(loadSettings(b).strictness).toBe('riba');
    expect(outbox(b)).toEqual([]);
    expect(upsertCalls()).toBe(before);

    // Newer: A syncs a change at 12:00, B changed at 12:30 and syncs at 13:00.
    setTime('2026-11-26T12:00:00Z');
    edit(a, () => ({ strictness: 'voda' }));
    await run(a);
    setPhoneTime('2026-11-26T12:30:00Z');
    edit(b, () => ({ strictness: 'ulje' }));
    setTime('2026-11-26T13:00:00Z');
    await run(b);
    expect(loadSettings(b).strictness).toBe('ulje');
    expect(server.live('user_practices', U)[0]?.settings).toEqual({ strictness: 'ulje', slavaId: null });
    await run(a);
    expect(loadSettings(a).strictness).toBe('ulje');
  });

  it('knows its own echo: a second edit survives the next pull even with the phone clock set back', async () => {
    const a = phone();
    setTime('2026-11-26T10:00:00Z');
    edit(a, (s) => ({ practices: orthodox(s), strictness: 'ulje' }));
    await run(a);

    setPhoneTime('2026-11-26T08:00:00Z'); // the clock goes back two hours
    edit(a, () => ({ strictness: 'riba' }));
    server.setTime('2026-11-26T10:30:00Z');
    await run(a);

    expect(loadSettings(a).strictness).toBe('riba');
    expect(server.live('user_practices', U)[0]?.settings).toEqual({ strictness: 'riba', slavaId: null });
    expect(outbox(a)).toEqual([]);
  });

  it('neither pushes nor pulls a group whose consent is off, and drops its queue', async () => {
    server.seed(U, 'user_allergies', [
      { id: stableId(U, 'allergies', 'allergen:jaja'), user_id: U, kind: 'allergen', code: 'jaja', deleted: false },
    ]);
    const a = phone();
    edit(a, (s) => ({ practices: orthodox(s), allergies: ['gluten'] }));
    expect(outbox(a).some((entry) => entry.tbl === 'allergies')).toBe(true);

    await run(a, ['practices', 'history']);

    expect(outbox(a)).toEqual([]);
    expect(server.calls.filter((c) => c.table === 'user_allergies')).toEqual([]);
    expect(loadSettings(a).allergies).toEqual(['gluten']);
    expect(server.live('user_allergies', U).map((r) => r.code)).toEqual(['jaja']);
    expect(server.live('user_practices', U)).toHaveLength(1);
  });

  it('never sends reason or updated_at, and a pull keeps the local reason', async () => {
    const a = phone();
    const b = phone();
    edit(a, () => ({ exceptions: { [DEC_2]: 'zdravlje' } }));
    await run(a);
    await run(b);
    expect(b.first('SELECT reason FROM day_marks')).toEqual({ reason: null });

    setTime('2026-11-26T10:00:00Z');
    edit(b, () => ({ exceptions: {} }));
    await run(b);
    await run(a);
    expect(loadSettings(a).exceptions).toEqual({});
    expect(a.first('SELECT reason, deleted FROM day_marks')).toEqual({ reason: 'zdravlje', deleted: 1 });

    setTime('2026-11-26T11:00:00Z');
    edit(b, () => ({ exceptions: { [DEC_2]: 'putovanje' } }));
    await run(b);
    await run(a);
    expect(loadSettings(a).exceptions).toEqual({ [DEC_2]: 'zdravlje' });

    const payloads = server.upserts().flat();
    expect(payloads.length).toBeGreaterThan(0);
    for (const row of payloads) {
      expect(row).not.toHaveProperty('reason');
      expect(row).not.toHaveProperty('updated_at');
      expect(row).toHaveProperty('user_id', U);
    }
  });

  it('sends a refused row alone and takes it out of the queue; the rest of the batch arrives', async () => {
    const a = phone();
    const long = 'š'.repeat(41);
    edit(a, () => ({ customAvoid: ['kivi', long, 'banana'], allergies: ['gluten'] }));

    await expect(run(a)).resolves.toEqual({ settingsChanged: false, rowsChanged: false });

    expect(
      server
        .live('user_allergies', U)
        .map((r) => r.code)
        .sort(),
    ).toEqual(['banana', 'gluten', 'kivi']);
    expect(server.upserts('user_allergies').map((rows) => rows.length)).toEqual([4, 1, 1, 1, 1]);
    expect(outbox(a)).toEqual([]);
    expect(loadSettings(a).customAvoid).toContain(long);
  });

  it('keeps the queue when the network fails, and sends it on the next run', async () => {
    const a = phone();
    await run(a);
    edit(a, () => ({ customAvoid: ['kivi'] }));
    // The push gives the row its fixed id before it sends it; the entry stays, under that id.
    const queued = [{ tbl: 'allergies', row_id: stableId(U, 'allergies', 'custom:kivi') }];

    server.failNext('offline', 'upsert');
    await expect(run(a)).rejects.toMatchObject({ kind: 'offline' });
    expect(outbox(a)).toEqual(queued);

    server.failNext('server', 'pull');
    await expect(run(a)).rejects.toMatchObject({ kind: 'server' });
    expect(outbox(a)).toEqual(queued);

    await run(a);
    expect(outbox(a)).toEqual([]);
    expect(server.live('user_allergies', U).map((r) => r.code)).toEqual(['kivi']);
  });

  it('writes no outbox entry when it pulls, so B pushes nothing back', async () => {
    const a = phone();
    const b = phone();
    await run(b);
    edit(a, (s) => ({ practices: orthodox(s), allergies: ['gluten'], exceptions: { [DEC_2]: 'drugo' }, city: 'bar' }));
    addSession(a, Date.parse('2026-11-26T06:00:00Z'));
    await run(a);

    const before = server.calls.filter((c) => c.op === 'upsert' || c.op === 'updateProfile').length;
    await run(b);
    expect(loadSettings(b).city).toBe('bar');
    expect(count(b, 'fasting_sessions')).toBe(1);
    expect(outbox(b)).toEqual([]);
    expect(server.calls.filter((c) => c.op === 'upsert' || c.op === 'updateProfile')).toHaveLength(before);
  });

  it('pulls all of 1,200 rows that share one timestamp, in pages of 500', async () => {
    const started = '2026-11-20T18:00:00.000Z';
    const stamp = server.seed(
      U,
      'fasting_sessions',
      Array.from({ length: 1200 }, () => ({
        id: globalThis.crypto.randomUUID(),
        user_id: U,
        started_at: started,
        ended_at: null,
        target_hours: 16,
        kind: 'if',
        deleted: false,
      })),
    );
    const b = phone();
    await run(b);

    expect(count(b, 'fasting_sessions')).toBe(1200);
    expect(server.calls.filter((c) => c.op === 'pull' && c.table === 'fasting_sessions')).toHaveLength(3);
    expect(loadState(b)?.marks.fasting_sessions?.ts).toBe(stamp);

    await run(b); // nothing new: one empty page
    expect(count(b, 'fasting_sessions')).toBe(1200);
  });

  it('skips a server row that fails the local checks, and moves the mark past it', async () => {
    const bad = { id: '00000000-0000-4000-8000-000000000001', user_id: U, updated_at: server.stamp() };
    server.tables.user_practices.set(bad.id, { ...bad, practice: 'post', active: true, settings: {}, deleted: false });
    server.seed(U, 'user_practices', [
      { id: stableId(U, 'practices', 'if'), user_id: U, practice: 'if', active: true, settings: { ifPlan: 14 } },
    ]);
    const b = phone();
    await run(b);
    expect(b.all('SELECT practice FROM practices')).toEqual([{ practice: 'if' }]);
    expect(loadState(b)?.marks.practices?.id).toBe(stableId(U, 'practices', 'if'));
  });
});

describe('profile', () => {
  it('never replaces a local profile with one whose city is null, and uploads the local one', async () => {
    const a = phone();
    edit(a, () => ({ city: 'ulcinj' }));
    server.profile(U); // the sign-up default: no city
    server.setTime('2026-11-26T12:00:00Z');
    await run(a);
    expect(loadSettings(a).city).toBe('ulcinj');
    expect(server.profiles.get(U)?.city).toBe('ulcinj');
  });

  it('takes a newer server profile and does not send it back', async () => {
    const a = phone();
    const b = phone();
    edit(a, () => ({ city: 'bar' }));
    edit(b, () => ({ city: 'plav' }));
    await run(b);
    setTime('2026-11-26T10:00:00Z');
    edit(a, () => ({ city: 'cetinje' }));
    await run(a); // A's profile is later: it wins and is pushed
    const updates = server.calls.filter((c) => c.op === 'updateProfile').length;

    setTime('2026-11-26T11:00:00Z');
    const result = await run(b);
    expect(result.settingsChanged).toBe(true);
    expect(loadSettings(b).city).toBe('cetinje');
    expect(server.calls.filter((c) => c.op === 'updateProfile')).toHaveLength(updates);
    expect(kvGet(b, 'settings')).toContain('cetinje');
  });
});

describe('deleteServerGroups', () => {
  it('deletes the rows, resets the profile, keeps the profiles row, and the next run uploads again', async () => {
    const a = phone();
    edit(a, (s) => ({ practices: orthodox(s), allergies: ['gluten'], city: 'bar' }));
    addSession(a, Date.parse('2026-11-26T06:00:00Z'));
    await run(a);

    await deleteServerGroups({ db: a, remote: server.remote(U), userId: U }, ['practices', 'history']);
    expect(server.rows('user_practices', U)).toEqual([]);
    expect(server.rows('fasting_sessions', U)).toEqual([]);
    expect(server.rows('user_allergies', U)).toHaveLength(1);
    expect(server.profiles.get(U)).toMatchObject({ city: null, prayer_method: 'izcg', ramadan_shift: 0 });
    expect(loadState(a)?.started).toEqual(['allergies']);

    setTime('2026-11-26T10:00:00Z');
    await run(a);
    expect(server.live('user_practices', U)).toHaveLength(1);
    expect(server.live('fasting_sessions', U)).toHaveLength(1);
    expect(server.profiles.get(U)?.city).toBe('bar');
    expect(loadSettings(a).city).toBe('bar');
  });
});
