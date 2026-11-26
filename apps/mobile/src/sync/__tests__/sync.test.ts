import { act, renderHook } from '@testing-library/react-native';
import { consents } from '@/db/repo/consents';
import { resetAuthForTests } from '@/lib/auth';
import { installTestDb } from '@/test/utils';
import { POLICY_VERSION, setConsents } from '../consents';
import { refreshSyncConsent, setSyncActivity, useSyncStatus } from '../index';

type AuthCb = (event: string, session: { user: unknown } | null) => void;

const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
const mockGetSession = jest.fn();
let authCb: AuthCb | null = null;
let mockClient: unknown = null;

jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockClient }));

const signIn = () =>
  act(() => {
    authCb?.('SIGNED_IN', { user: { id: 'u1', app_metadata: { provider: 'email' } } });
  });

beforeEach(() => {
  installTestDb();
  resetAuthForTests();
  refreshSyncConsent();
  setSyncActivity('idle');
  authCb = null;
  mockInsert.mockReset();
  mockInsert.mockResolvedValue({ error: null, status: 201 });
  mockFrom.mockClear();
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
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

describe('useSyncStatus', () => {
  it('is off for a guest, even with consent', async () => {
    const { result } = await renderHook(() => useSyncStatus());
    expect(result.current).toBe('off');
    await act(() => setConsents({ history: true }));
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
    expect(result.current).toBe('idle');
    await act(() => setSyncActivity('syncing'));
    expect(result.current).toBe('syncing');
    await act(() => setSyncActivity('error'));
    expect(result.current).toBe('error');
    await act(() => setConsents({ history: false }));
    expect(result.current).toBe('off');
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
      { user_id: 'u1', kind: 'ai', granted: true, policy_version: POLICY_VERSION },
      { user_id: 'u1', kind: 'sync_practices', granted: true, policy_version: POLICY_VERSION },
      { user_id: 'u1', kind: 'sync_allergies', granted: false, policy_version: POLICY_VERSION },
      { user_id: 'u1', kind: 'sync_history', granted: true, policy_version: POLICY_VERSION },
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
});
