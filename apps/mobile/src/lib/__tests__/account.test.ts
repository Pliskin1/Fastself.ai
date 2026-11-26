import { DEFAULT_REMINDERS, DEFAULT_SETTINGS } from '@fastself/core';
import { getDb } from '@/db';
import { consents, fastingSessions, type ConsentKind } from '@/db/repo';
import { kvDelete, kvGet, kvSet } from '@/db/repo/kv';
import { deleteAccountAndSignOut, wipeDevice } from '@/lib/account';
import { deleteAccount } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { clearExportFiles } from '@/lib/export';
import { rescheduleAll } from '@/notifications';
import { getSettings, updateSettings } from '@/store/settings';
import { resetSyncForTests, settleSyncForTests, syncNow } from '@/sync';
import { installTestDb } from '@/test/utils';

jest.mock('@/lib/api', () => ({ deleteAccount: jest.fn() }));
jest.mock('@/lib/auth', () => ({ ...jest.requireActual('@/lib/auth'), signOut: jest.fn() }));
jest.mock('@/notifications', () => ({ rescheduleAll: jest.fn(() => Promise.resolve()) }));
jest.mock('@/lib/export', () => ({ clearExportFiles: jest.fn() }));
// A sync run reaches the client first through getSession, so a held getSession is a run in flight.
const mockGetSession = jest.fn();
jest.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  }),
}));

const remove = jest.mocked(deleteAccount);
const signOutMock = jest.mocked(signOut);
const reschedule = jest.mocked(rescheduleAll);

const U = 'u1';
const ALL: ConsentKind[] = ['ai', 'practices', 'allergies', 'history'];
const GUEST = { data: { session: null }, error: null };
const SYNC_STATE = JSON.stringify({ user: U, at: 1 });

const outboxSize = () => getDb().first<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')?.n;
const kvKeys = () =>
  getDb()
    .all<{ key: string }>('SELECT key FROM kv ORDER BY key')
    .map((row) => row.key);
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** A signed-in phone with every consent on, local data, a queued upload and a sync state. */
function seedSignedIn(): void {
  const db = getDb();
  kvSet(db, 'auth_user_id', U);
  for (const kind of ALL) consents.set(kind, true);
  updateSettings({
    onboarded: true,
    city: 'bar',
    allergies: ['gluten'],
    practices: { ...DEFAULT_SETTINGS.practices, orthodox: true },
  });
  fastingSessions.start(16);
  db.run('INSERT INTO outbox (tbl, row_id, op, created_at) VALUES (?, ?, ?, ?)', ['practices', 'p1', 'upsert', 1]);
  kvSet(db, 'last_sync_at', SYNC_STATE);
}

function holdSyncRun(): () => void {
  let release: () => void = () => undefined;
  mockGetSession.mockReturnValueOnce(new Promise((resolve) => (release = () => resolve(GUEST))));
  void syncNow();
  return () => release();
}

beforeEach(() => {
  jest.clearAllMocks();
  installTestDb();
  resetSyncForTests();
  mockGetSession.mockResolvedValue(GUEST);
  remove.mockResolvedValue({ ok: true, data: null });
  // Like the real one: the session goes, then kv auth_user_id.
  signOutMock.mockImplementation(async () => {
    kvDelete(getDb(), 'auth_user_id');
    return { ok: true };
  });
});

afterEach(async () => {
  await settleSyncForTests();
  resetSyncForTests();
});

describe('deleteAccountAndSignOut', () => {
  it('signs out, empties the outbox, forgets the sync state and turns the four consents off', async () => {
    seedSignedIn();
    expect(outboxSize()).toBeGreaterThan(0);

    await expect(deleteAccountAndSignOut()).resolves.toEqual({ ok: true });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(signOutMock.mock.invocationCallOrder[0] ?? 0);
    expect(outboxSize()).toBe(0);
    expect(kvGet(getDb(), 'last_sync_at')).toBeNull();
    expect(kvGet(getDb(), 'auth_user_id')).toBeNull();
    for (const kind of ALL) expect(consents.get(kind)).toBe(false);
  });

  it('keeps the local data: practices, allergies, history and settings stay', async () => {
    seedSignedIn();
    const session = fastingSessions.current();

    await deleteAccountAndSignOut();

    expect(getSettings()).toMatchObject({ onboarded: true, city: 'bar', allergies: ['gluten'] });
    expect(getSettings().practices.orthodox).toBe(true);
    expect(getDb().first<{ n: number }>('SELECT COUNT(*) AS n FROM practices WHERE deleted = 0')?.n).toBe(1);
    expect(fastingSessions.current()).toEqual(session);
    expect(reschedule).not.toHaveBeenCalled();
  });

  it.each(['offline', 'server'] as const)('changes nothing on the phone when the delete fails (%s)', async (error) => {
    seedSignedIn();
    const outbox = outboxSize();
    remove.mockResolvedValue({ ok: false, error });

    await expect(deleteAccountAndSignOut()).resolves.toEqual({ ok: false, error });

    expect(signOutMock).not.toHaveBeenCalled();
    expect(outboxSize()).toBe(outbox);
    expect(kvGet(getDb(), 'last_sync_at')).toBe(SYNC_STATE);
    expect(kvGet(getDb(), 'auth_user_id')).toBe(U);
    for (const kind of ALL) expect(consents.get(kind)).toBe(true);
  });

  it('waits for a sync run in flight before it calls the server', async () => {
    seedSignedIn();
    const release = holdSyncRun();
    const deleting = deleteAccountAndSignOut();
    await flush();
    expect(remove).not.toHaveBeenCalled();

    release();
    await expect(deleting).resolves.toEqual({ ok: true });
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe('wipeDevice', () => {
  it('signs out before the wipe, then leaves only install_id and the default settings', async () => {
    seedSignedIn();
    const installId = kvGet(getDb(), 'install_id');
    let dataAtSignOut: boolean | null = null;
    signOutMock.mockImplementation(async () => {
      dataAtSignOut = fastingSessions.current() !== null && getSettings().onboarded;
      kvDelete(getDb(), 'auth_user_id');
      return { ok: true };
    });

    await wipeDevice();

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(dataAtSignOut).toBe(true);
    expect(kvKeys()).toEqual(['install_id']);
    expect(kvGet(getDb(), 'install_id')).toBe(installId);
    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, onboarded: false, reminders: DEFAULT_REMINDERS });
    expect(fastingSessions.current()).toBeNull();
    expect(outboxSize()).toBe(0);
    for (const kind of ALL) expect(consents.get(kind)).toBe(false);
    expect(reschedule).toHaveBeenCalledTimes(1);
    expect(jest.mocked(clearExportFiles)).toHaveBeenCalledTimes(1);
  });

  it('works for a guest whose sign-out has nothing to do', async () => {
    updateSettings({ onboarded: true, city: 'bar' });
    signOutMock.mockResolvedValue({ ok: false, error: 'server' }); // a build with no client

    await wipeDevice();

    expect(kvKeys()).toEqual(['install_id']);
    expect(getSettings().onboarded).toBe(false);
  });

  it('waits for a sync run in flight before it signs out or wipes', async () => {
    seedSignedIn();
    const release = holdSyncRun();
    const wiping = wipeDevice();
    await flush();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(getSettings().onboarded).toBe(true);

    release();
    await wiping;
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(getSettings().onboarded).toBe(false);
  });
});
