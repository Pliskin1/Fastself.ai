import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { getDb } from '@/db';
import { consents } from '@/db/repo/consents';
import { kvSet } from '@/db/repo/kv';
import { resetAuthForTests } from '@/lib/auth';
import { getSettings, updateSettings } from '@/store/settings';
import { installTestDb } from '@/test/utils';
import { POLICY_VERSION, setConsents } from '../consents';
import { stableId } from '../ids';
import {
  deleteServerCopy,
  refreshSyncConsent,
  resetSyncForTests,
  setSyncActivity,
  settleSyncForTests,
  startSync,
  syncNow,
  useSyncRev,
  useSyncStatus,
} from '../index';
import { createSupabaseRemote } from '../remote';
import { FakeServer } from '../testing/fakeServer';

type AuthCb = (event: string, session: { user: unknown } | null) => void;

const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
const mockGetSession = jest.fn();
let authCb: AuthCb | null = null;
let mockClient: unknown = null;
/** The data tables answer from a fake server: empty unless a test puts rows in it. */
const mockServer: { current: FakeServer | null } = { current: null };

jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockClient }));
jest.mock('../remote', () => ({
  ...jest.requireActual('../remote'),
  createSupabaseRemote: jest.fn((_client: unknown, userId: string) => mockServer.current?.remote(userId)),
}));

const createRemote = jest.mocked(createSupabaseRemote);
const U = 'u1';
const server = () => {
  if (!mockServer.current) throw new Error('no server');
  return mockServer.current;
};
const outboxSize = () => getDb().first<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')?.n;
const settle = () => act(() => settleSyncForTests());

const signIn = () =>
  act(() => {
    authCb?.('SIGNED_IN', { user: { id: U, app_metadata: { provider: 'email' } } });
  });

// The React Native preset mocks AppState.currentState as a function; the app reads it as a string.
const appState = AppState as unknown as { currentState: unknown };
const initialAppState = appState.currentState;
const setAppState = (state: string) => {
  appState.currentState = state;
};

beforeEach(() => {
  installTestDb();
  resetSyncForTests();
  resetAuthForTests();
  refreshSyncConsent();
  setSyncActivity('idle');
  authCb = null;
  mockServer.current = new FakeServer();
  createRemote.mockClear();
  mockInsert.mockReset();
  mockInsert.mockResolvedValue({ error: null, status: 201 });
  mockFrom.mockClear();
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: U } } } });
  mockClient = {
    auth: {
      onAuthStateChange: (cb: AuthCb) => {
        authCb = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
      getSession: mockGetSession,
    },
    from: mockFrom,
  };
});

afterEach(async () => {
  await settleSyncForTests();
  resetSyncForTests();
  jest.useRealTimers();
  jest.restoreAllMocks();
  appState.currentState = initialAppState;
});

describe('useSyncStatus', () => {
  it('is off for a guest, even with consent', async () => {
    const { result } = await renderHook(() => useSyncStatus());
    expect(result.current).toBe('off');
    await act(() => setConsents({ history: true }));
    await settle();
    expect(result.current).toBe('off');
  });

  it('is off when signed in without any sync consent', async () => {
    const { result } = await renderHook(() => useSyncStatus());
    await signIn();
    expect(result.current).toBe('off');
    await act(() => setConsents({ ai: true }));
    expect(result.current).toBe('off');
  });

  it('is idle once a sync consent is on while signed in, and follows the activity', async () => {
    const { result } = await renderHook(() => useSyncStatus());
    await signIn();
    await act(() => setConsents({ history: true }));
    await settle();
    expect(result.current).toBe('idle');
    await act(() => setSyncActivity('syncing'));
    expect(result.current).toBe('syncing');
    await act(() => setSyncActivity('error'));
    expect(result.current).toBe('error');
    await act(() => setConsents({ history: false }));
    expect(result.current).toBe('off');
  });

  it('starts the sync on mount, and shows error after a failed run and idle after the next one', async () => {
    const { result } = await renderHook(() => useSyncStatus());
    await settle();
    expect(mockGetSession).toHaveBeenCalled(); // the mount ran a sync (nothing consented yet)

    await signIn();
    await act(() => setConsents({ allergies: true }));
    await settle();
    await act(async () => updateSettings({ customAvoid: ['kivi'] }));
    expect(outboxSize()).toBe(1);

    server().setDown('offline');
    expect(await act(() => syncNow())).toEqual({ ok: false, error: 'offline' });
    expect(result.current).toBe('error');
    expect(outboxSize()).toBe(1);

    server().setDown(null);
    expect(await act(() => syncNow())).toEqual({ ok: true });
    expect(result.current).toBe('idle');
    expect(outboxSize()).toBe(0);
    expect(
      server()
        .live('user_allergies', U)
        .map((row) => row.code),
    ).toEqual(['kivi']);
  });
});

describe('syncNow', () => {
  it('does nothing for a guest, without consent or without a client', async () => {
    consents.set('history', true);
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(syncNow()).resolves.toEqual({ ok: true });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: U } } } });
    consents.set('history', false);
    await expect(syncNow()).resolves.toEqual({ ok: true });
    consents.set('history', true);
    mockClient = null;
    await expect(syncNow()).resolves.toEqual({ ok: true });
    expect(createRemote).not.toHaveBeenCalled();
  });

  it('runs one sync at a time; calls during a run cause exactly one more run and share its result', async () => {
    consents.set('history', true);
    const release = server().hold();
    const first = syncNow();
    await act(async () => undefined);
    const second = syncNow();
    const third = syncNow();
    expect(third).toBe(second);
    release();
    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
    await settleSyncForTests();
    expect(createRemote).toHaveBeenCalledTimes(2);
  });

  it('re-reads the settings store and bumps useSyncRev when a pull changed rows', async () => {
    consents.set('allergies', true);
    server().seed(U, 'user_allergies', [
      { id: stableId(U, 'allergies', 'allergen:jaja'), user_id: U, kind: 'allergen', code: 'jaja', deleted: false },
    ]);
    const { result } = await renderHook(() => useSyncRev());
    expect(result.current).toBe(0);
    await act(() => syncNow());
    expect(getSettings().allergies).toEqual(['jaja']);
    expect(result.current).toBe(1);
    await act(() => syncNow()); // nothing new
    expect(result.current).toBe(1);
  });

  it('refreshes the settings store with what the pull wrote even when the push then fails', async () => {
    updateSettings({ customAvoid: ['kivi'] }); // a guest row: the first sync queues it
    consents.set('allergies', true);
    server().seed(U, 'user_allergies', [
      { id: stableId(U, 'allergies', 'allergen:jaja'), user_id: U, kind: 'allergen', code: 'jaja', deleted: false },
    ]);
    server().failNext('offline', 'upsert');
    let result: unknown;
    await act(async () => {
      result = await syncNow();
    });
    expect(result).toEqual({ ok: false, error: 'offline' });
    expect(getSettings().allergies).toEqual(['jaja']);
    expect(getSettings().customAvoid).toEqual(['kivi']);
    expect(outboxSize()).toBe(1);
  });

  it('stops sending a group when its consent is turned off while the run is in flight', async () => {
    consents.set('history', true);
    getDb().run(
      "INSERT INTO fasting_sessions (id, started_at, ended_at, target_hours, kind, updated_at) VALUES (?, ?, ?, 16, 'if', ?)",
      [globalThis.crypto.randomUUID(), 1_000, 2_000, 3_000],
    );
    const release = server().hold();
    const running = syncNow();
    await act(async () => undefined);
    consents.set('history', false);
    release();
    await expect(running).resolves.toEqual({ ok: true });
    expect(server().upserts('fasting_sessions')).toEqual([]);
  });

  it('fails, and does not report success, when the session of a signed-in user cannot be loaded', async () => {
    kvSet(getDb(), 'auth_user_id', U);
    consents.set('history', true);
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { status: 0, message: 'Network request failed' },
    });
    await expect(deleteServerCopy(['history'])).resolves.toEqual({ ok: false, error: 'offline' });
    await expect(syncNow()).resolves.toEqual({ ok: false, error: 'offline' });

    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(deleteServerCopy(['history'])).resolves.toEqual({ ok: false, error: 'server' });
    expect(createRemote).not.toHaveBeenCalled();
  });
});

describe('startSync', () => {
  it('is idempotent and runs on sign-in and on return to the foreground', async () => {
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    consents.set('history', true);
    const stop = startSync();
    expect(startSync()).toBe(stop);
    expect(listeners).toHaveLength(1);
    await settle();
    expect(createRemote).toHaveBeenCalledTimes(1);

    await signIn();
    await settle();
    expect(createRemote).toHaveBeenCalledTimes(2);

    listeners.forEach((listener) => listener('background'));
    listeners.forEach((listener) => listener('active'));
    await settle();
    expect(createRemote).toHaveBeenCalledTimes(3);
  });

  it('ticks: a local write starts a run within 5 s; with nothing new a failed run is not tried again', async () => {
    jest.useFakeTimers();
    setAppState('active');
    consents.set('allergies', true);
    startSync();
    await settle();
    await signIn(); // sets auth_user_id, which the tick and the outbox need
    await settle();
    const runs = () => createRemote.mock.calls.length;
    const tick = async (ms = 5000) => {
      await act(() => jest.advanceTimersByTimeAsync(ms));
      await settle();
    };

    let before = runs();
    await tick(15000);
    expect(runs()).toBe(before); // nothing new

    updateSettings({ customAvoid: ['kivi'] });
    await tick();
    expect(runs()).toBe(before + 1);
    expect(server().live('user_allergies', U)).toHaveLength(1);

    server().setDown('offline');
    updateSettings({ customAvoid: ['kivi', 'banana'] });
    before = runs();
    await tick();
    expect(runs()).toBe(before + 1); // tried once, failed
    await tick(20000);
    expect(runs()).toBe(before + 1); // not again while nothing changed

    updateSettings({ city: 'bar' }); // a profile change counts as new
    await tick();
    expect(runs()).toBe(before + 2);

    setAppState('background');
    server().setDown(null);
    updateSettings({ customAvoid: ['kivi'] });
    await tick(20000);
    expect(runs()).toBe(before + 2); // no tick in the background
  });
});

describe('deleteServerCopy', () => {
  it('deletes the rows and resets the profile; turning the consent on again uploads everything', async () => {
    startSync();
    await signIn();
    await act(() => setConsents({ practices: true, allergies: true }));
    await settle();
    await act(async () =>
      updateSettings({
        practices: { ...getSettings().practices, orthodox: true },
        allergies: ['gluten'],
        city: 'bar',
      }),
    );
    await act(() => syncNow());
    expect(server().live('user_practices', U)).toHaveLength(1);
    expect(server().profiles.get(U)?.city).toBe('bar');

    await act(() => setConsents({ practices: false, allergies: false }));
    await expect(deleteServerCopy(['practices', 'allergies'])).resolves.toEqual({ ok: true });
    expect(server().rows('user_practices', U)).toEqual([]);
    expect(server().rows('user_allergies', U)).toEqual([]);
    expect(server().profiles.has(U)).toBe(true);
    expect(server().profiles.get(U)).toMatchObject({ city: null, prayer_method: 'izcg', ramadan_shift: 0 });
    expect(getSettings().city).toBe('bar'); // the phone keeps its data

    await act(() => setConsents({ practices: true, allergies: true }));
    await settle();
    expect(server().live('user_practices', U)).toHaveLength(1);
    expect(server().live('user_allergies', U)).toHaveLength(1);
    expect(server().profiles.get(U)?.city).toBe('bar');
  });

  it('returns the error when the server cannot be reached, and does nothing for a guest', async () => {
    server().setDown('offline');
    await expect(deleteServerCopy(['history'])).resolves.toEqual({ ok: false, error: 'offline' });
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(deleteServerCopy(['history'])).resolves.toEqual({ ok: true });
  });

  it('makes a sync asked for during the deletion wait, so that run cannot undo the reset', async () => {
    startSync();
    await signIn();
    await act(() => setConsents({ allergies: true, history: true }));
    await settle();
    await act(async () => updateSettings({ allergies: ['gluten'] }));
    await act(() => syncNow());
    expect(server().live('user_allergies', U)).toHaveLength(1);

    await act(() => setConsents({ allergies: false })); // history stays on, so runs still happen
    await settle();
    const release = server().hold();
    const deleting = deleteServerCopy(['allergies']);
    await act(async () => undefined);
    const during = syncNow();
    release();
    await expect(deleting).resolves.toEqual({ ok: true });
    await act(() => during);
    await settle();
    expect(server().rows('user_allergies', U)).toEqual([]);

    await act(() => setConsents({ allergies: true }));
    await settle();
    expect(server().live('user_allergies', U)).toHaveLength(1);
  });
});

describe('setConsents', () => {
  it('writes the local flags for a guest and makes no insert', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await setConsents({ practices: true, ai: false })).toEqual({ ok: true });
    expect(consents.get('practices')).toBe(true);
    expect(consents.get('ai')).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('writes locally and skips the network when the build has no client', async () => {
    mockClient = null;
    expect(await setConsents({ allergies: true })).toEqual({ ok: true });
    expect(consents.get('allergies')).toBe(true);
  });

  it('inserts one mapped row per flag with the policy version when signed in', async () => {
    expect(await setConsents({ ai: true, practices: true, allergies: false, history: true })).toEqual({ ok: true });
    expect(mockFrom).toHaveBeenCalledWith('consents');
    expect(mockInsert).toHaveBeenCalledWith([
      { user_id: U, kind: 'ai', granted: true, policy_version: POLICY_VERSION },
      { user_id: U, kind: 'sync_practices', granted: true, policy_version: POLICY_VERSION },
      { user_id: U, kind: 'sync_allergies', granted: false, policy_version: POLICY_VERSION },
      { user_id: U, kind: 'sync_history', granted: true, policy_version: POLICY_VERSION },
    ]);
  });

  it('sends nothing for an empty change', async () => {
    expect(await setConsents({})).toEqual({ ok: true });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it.each([
    [0, 'offline'],
    [403, 'server'],
  ])('keeps the local flags and returns the error when the insert fails with status %s', async (status, error) => {
    mockInsert.mockResolvedValue({ error: { message: 'x', code: '' }, status });
    expect(await setConsents({ history: true })).toEqual({ ok: false, error });
    expect(consents.get('history')).toBe(true);
  });

  it('never throws when the insert rejects', async () => {
    mockInsert.mockRejectedValue(new Error('boom'));
    expect(await setConsents({ history: true })).toEqual({ ok: false, error: 'server' });
    expect(consents.get('history')).toBe(true);
  });

  it('starts a sync run when a sync kind is turned on, and not for ai or for turning one off', async () => {
    await setConsents({ ai: true });
    await setConsents({ history: false });
    await settleSyncForTests();
    expect(createRemote).not.toHaveBeenCalled();

    await setConsents({ history: true });
    await settleSyncForTests();
    expect(createRemote).toHaveBeenCalledTimes(1);
  });
});
