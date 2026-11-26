import { act, renderHook } from '@testing-library/react-native';
import { installTestDb } from '@/test/utils';
import { bumpSyncRev, resetSyncForTests, runWhileSyncIdle, settleSyncForTests, syncNow, useSyncRev } from '../index';

// A run reaches the client first through getSession, so a held getSession is a run in flight.
type SessionAnswer = { data: { session: null }; error: null };
const GUEST: SessionAnswer = { data: { session: null }, error: null };

const mockGetSession = jest.fn();
jest.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  }),
}));

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function holdSession(): () => void {
  let release: () => void = () => undefined;
  mockGetSession.mockReturnValueOnce(new Promise<SessionAnswer>((resolve) => (release = () => resolve(GUEST))));
  return () => release();
}

beforeEach(() => {
  installTestDb();
  resetSyncForTests();
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue(GUEST);
});

afterEach(async () => {
  await settleSyncForTests();
  resetSyncForTests();
});

describe('runWhileSyncIdle', () => {
  it('starts the job only after the run in flight ended', async () => {
    const release = holdSession();
    const run = syncNow();
    const job = jest.fn(async () => 'done');
    const result = runWhileSyncIdle(job);
    await flush();
    expect(job).not.toHaveBeenCalled();

    release();
    await expect(result).resolves.toBe('done');
    expect(job).toHaveBeenCalledTimes(1);
    await expect(run).resolves.toEqual({ ok: true });
  });

  it('holds back a sync asked for while the job works until the job ended', async () => {
    let finish: () => void = () => undefined;
    const job = runWhileSyncIdle(() => new Promise<string>((resolve) => (finish = () => resolve('x'))));
    const during = syncNow();
    await flush();
    expect(mockGetSession).not.toHaveBeenCalled();

    finish();
    await expect(job).resolves.toBe('x');
    await expect(during).resolves.toEqual({ ok: true });
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it('rejects to its caller when the job rejects, and frees the place for the queued run', async () => {
    let fail: (error: Error) => void = () => undefined;
    const job = runWhileSyncIdle(() => new Promise<never>((_resolve, reject) => (fail = reject)));
    const during = syncNow();
    fail(new Error('boom'));
    await expect(job).rejects.toThrow('boom');
    await expect(during).resolves.toEqual({ ok: true });

    // A job that throws before it returns a promise rejects the same way.
    await expect(
      runWhileSyncIdle(() => {
        throw new Error('sync boom');
      }),
    ).rejects.toThrow('sync boom');
    await settleSyncForTests();
    await expect(syncNow()).resolves.toEqual({ ok: true });
    expect(mockGetSession).toHaveBeenCalledTimes(2);
  });

  it('lets a second caller wait for the first job', async () => {
    let finish: () => void = () => undefined;
    const first = runWhileSyncIdle(() => new Promise<number>((resolve) => (finish = () => resolve(1))));
    const second = jest.fn(async () => 2);
    const result = runWhileSyncIdle(second);
    await flush();
    expect(second).not.toHaveBeenCalled();
    finish();
    await expect(first).resolves.toBe(1);
    await expect(result).resolves.toBe(2);
  });
});

describe('bumpSyncRev', () => {
  it('raises the number useSyncRev returns', async () => {
    const { result } = await renderHook(() => useSyncRev());
    expect(result.current).toBe(0);
    await act(() => bumpSyncRev());
    expect(result.current).toBe(1);
  });
});
