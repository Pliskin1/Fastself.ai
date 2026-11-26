import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { act, renderHook } from '@testing-library/react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { getDb } from '@/db';
import { kvGet } from '@/db/repo/kv';
import { installTestDb } from '@/test/utils';
import { appleToken } from '../api';
import {
  AppleSignInUnavailableError,
  OTP_LIFETIME_SECONDS,
  onAuthChange,
  resetAuthForTests,
  sendEmailCode,
  signInApple,
  signOut,
  useSession,
  verifyEmailCode,
} from '../auth';

type AuthCb = (event: string, session: { user: unknown } | null) => void;

const mockAuth = {
  signInWithOtp: jest.fn(),
  verifyOtp: jest.fn(),
  signInWithIdToken: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChange: jest.fn(),
};
let mockClient: { auth: typeof mockAuth } | null = null;
let authCb: AuthCb | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('../supabase', () => ({ getSupabase: () => mockClient }));
jest.mock('../api', () => ({ appleToken: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { EMAIL: 1, FULL_NAME: 0 },
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'raw-nonce',
  digestStringAsync: jest.fn(async (_alg: string, value: string) => `hash(${value})`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

const signInAsync = AppleAuthentication.signInAsync as jest.Mock;
const mockAppleToken = appleToken as jest.Mock;

const user = (id: string, provider = 'email') => ({ id, app_metadata: { provider } });
const emit = (event: string, u: ReturnType<typeof user> | null) =>
  act(() => {
    authCb?.(event, u ? { user: u } : null);
  });

const apiError = (code: string, status: number) => new AuthApiError('x', status, code);

beforeEach(() => {
  installTestDb();
  resetAuthForTests();
  authCb = null;
  mockUnsubscribe.mockReset();
  Object.values(mockAuth).forEach((fn) => fn.mockReset());
  mockAuth.onAuthStateChange.mockImplementation((cb: AuthCb) => {
    authCb = cb;
    return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
  });
  mockAuth.signInWithOtp.mockResolvedValue({ error: null });
  mockAuth.verifyOtp.mockResolvedValue({ error: null });
  mockAuth.signInWithIdToken.mockResolvedValue({ error: null });
  mockAuth.signOut.mockResolvedValue({ error: null });
  mockAppleToken.mockReset();
  mockAppleToken.mockResolvedValue({ ok: true, data: null });
  signInAsync.mockReset();
  mockClient = { auth: mockAuth };
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('without a Supabase client', () => {
  beforeEach(() => {
    mockClient = null;
  });

  it('answers server everywhere and has no session', async () => {
    expect(await sendEmailCode('a@b.co')).toEqual({ ok: false, error: 'server' });
    expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: false, error: 'server' });
    expect(await signOut()).toEqual({ ok: false, error: 'server' });
    expect(await signInApple()).toEqual({ ok: false, error: 'server' });
    expect(signInAsync).not.toHaveBeenCalled();
    const { result } = await renderHook(() => useSession());
    expect(result.current).toEqual({ user: null, provider: null });
  });
});

describe('sendEmailCode', () => {
  it('trims and lower-cases the email and asks for account creation', async () => {
    expect(await sendEmailCode('  Ana@Example.COM ')).toEqual({ ok: true });
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
      email: 'ana@example.com',
      options: { shouldCreateUser: true },
    });
  });

  it.each(['', 'ana', 'ana@', '@x.co', 'a b@x.co', 'ana@x'])('never sends %j to the client', async (bad) => {
    expect(await sendEmailCode(bad)).toEqual({ ok: false, error: 'invalid_email' });
    expect(mockAuth.signInWithOtp).not.toHaveBeenCalled();
  });

  it.each([
    [new AuthRetryableFetchError('net', 0), 'offline'],
    [new AuthRetryableFetchError('down', 503), 'server'],
    [apiError('over_email_send_rate_limit', 429), 'rate_limited'],
    [apiError('over_request_rate_limit', 429), 'rate_limited'],
    [apiError('anything', 429), 'rate_limited'],
    [apiError('email_address_invalid', 400), 'invalid_email'],
    [apiError('validation_failed', 422), 'invalid_email'],
    [apiError('unexpected_failure', 500), 'server'],
  ])('maps %p to %s', async (error, expected) => {
    mockAuth.signInWithOtp.mockResolvedValue({ error });
    expect(await sendEmailCode('a@b.co')).toEqual({ ok: false, error: expected });
  });

  it('maps a thrown error too', async () => {
    mockAuth.signInWithOtp.mockRejectedValue(new AuthRetryableFetchError('net', 0));
    expect(await sendEmailCode('a@b.co')).toEqual({ ok: false, error: 'offline' });
  });
});

describe('verifyEmailCode', () => {
  it('verifies a trimmed 6 digit code for the normalised email', async () => {
    expect(await verifyEmailCode(' A@B.co ', ' 123456 ')).toEqual({ ok: true });
    expect(mockAuth.verifyOtp).toHaveBeenCalledWith({ email: 'a@b.co', token: '123456', type: 'email' });
  });

  it.each(['', '12345', '1234567', 'abcdef', '12 456'])('rejects %j without a network call', async (bad) => {
    expect(await verifyEmailCode('a@b.co', bad)).toEqual({ ok: false, error: 'invalid_code' });
    expect(mockAuth.verifyOtp).not.toHaveBeenCalled();
  });

  it('maps network and rate limit errors', async () => {
    mockAuth.verifyOtp.mockResolvedValueOnce({ error: new AuthRetryableFetchError('net', 0) });
    expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: false, error: 'offline' });
    mockAuth.verifyOtp.mockResolvedValueOnce({ error: apiError('over_request_rate_limit', 429) });
    expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: false, error: 'rate_limited' });
    mockAuth.verifyOtp.mockResolvedValueOnce({ error: apiError('unexpected_failure', 500) });
    expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: false, error: 'server' });
  });

  describe('otp_expired', () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
      jest.setSystemTime(new Date('2026-12-01T10:00:00Z'));
      mockAuth.verifyOtp.mockResolvedValue({ error: apiError('otp_expired', 403) });
    });

    it('is invalid_code when no code was sent from this install', async () => {
      expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: false, error: 'invalid_code' });
    });

    it('is invalid_code within the code lifetime', async () => {
      await sendEmailCode('a@b.co');
      jest.setSystemTime(Date.now() + (OTP_LIFETIME_SECONDS - 1) * 1000);
      expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: false, error: 'invalid_code' });
    });

    it('is expired after the code lifetime, whatever the case of the email', async () => {
      await sendEmailCode('A@B.co');
      jest.setSystemTime(Date.now() + OTP_LIFETIME_SECONDS * 1000);
      expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: false, error: 'expired' });
    });

    it('does not count a failed send', async () => {
      mockAuth.signInWithOtp.mockResolvedValue({ error: apiError('over_email_send_rate_limit', 429) });
      await sendEmailCode('a@b.co');
      jest.setSystemTime(Date.now() + 700_000);
      expect(await verifyEmailCode('a@b.co', '123456')).toEqual({ ok: false, error: 'invalid_code' });
    });
  });
});

describe('signInApple', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('gives Apple the hashed nonce and Supabase the raw one, then hands over the authorization code', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'id-token', authorizationCode: 'auth-code' });
    expect(await signInApple()).toEqual({ ok: true });
    expect(signInAsync).toHaveBeenCalledWith({ requestedScopes: [1], nonce: 'hash(raw-nonce)' });
    expect(mockAuth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'id-token',
      nonce: 'raw-nonce',
    });
    expect(mockAppleToken).toHaveBeenCalledWith('auth-code');
  });

  it('still succeeds when appleToken fails or rejects', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'id-token', authorizationCode: 'auth-code' });
    mockAppleToken.mockResolvedValueOnce({ ok: false, error: 'offline' });
    expect(await signInApple()).toEqual({ ok: true });
    mockAppleToken.mockRejectedValueOnce(new Error('boom'));
    expect(await signInApple()).toEqual({ ok: true });
  });

  it('skips appleToken when there is no authorization code', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'id-token', authorizationCode: null });
    expect(await signInApple()).toEqual({ ok: true });
    expect(mockAppleToken).not.toHaveBeenCalled();
  });

  it('gives cancelled when the user cancels', async () => {
    signInAsync.mockRejectedValue(Object.assign(new Error('x'), { code: 'ERR_REQUEST_CANCELED' }));
    expect(await signInApple()).toEqual({ ok: false, error: 'cancelled' });
    expect(mockAuth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it('gives server for another Apple failure and for a missing identity token', async () => {
    signInAsync.mockRejectedValueOnce(new Error('x'));
    expect(await signInApple()).toEqual({ ok: false, error: 'server' });
    signInAsync.mockResolvedValueOnce({ identityToken: null, authorizationCode: 'c' });
    expect(await signInApple()).toEqual({ ok: false, error: 'server' });
    expect(mockAuth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it('maps a Supabase error and does not call appleToken', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'id-token', authorizationCode: 'auth-code' });
    mockAuth.signInWithIdToken.mockResolvedValue({ error: new AuthRetryableFetchError('net', 0) });
    expect(await signInApple()).toEqual({ ok: false, error: 'offline' });
    expect(mockAppleToken).not.toHaveBeenCalled();
  });

  it('throws on Android and calls nothing', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await expect(signInApple()).rejects.toBeInstanceOf(AppleSignInUnavailableError);
    expect(signInAsync).not.toHaveBeenCalled();
    expect(mockAuth.signInWithIdToken).not.toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('signs out of this device only', async () => {
    expect(await signOut()).toEqual({ ok: true });
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('ends signed out locally when the revoke fails or throws', async () => {
    const { result } = await renderHook(() => useSession());
    await emit('SIGNED_IN', user('u1'));
    expect(result.current.user).not.toBeNull();
    mockAuth.signOut.mockResolvedValue({ error: new AuthRetryableFetchError('net', 0) });
    await act(async () => {
      expect(await signOut()).toEqual({ ok: true });
    });
    expect(result.current).toEqual({ user: null, provider: null });
    expect(kvGet(getDb(), 'auth_user_id')).toBeNull();
    await emit('SIGNED_IN', user('u1'));
    mockAuth.signOut.mockRejectedValue(new Error('boom'));
    await act(async () => {
      expect(await signOut()).toEqual({ ok: true });
    });
    expect(result.current.user).toBeNull();
  });
});

describe('useSession', () => {
  it('follows SIGNED_IN, TOKEN_REFRESHED and SIGNED_OUT and tells Apple from email', async () => {
    const { result } = await renderHook(() => useSession());
    expect(result.current).toEqual({ user: null, provider: null });
    await emit('SIGNED_IN', user('u1', 'email'));
    expect(result.current.provider).toBe('email');
    expect(result.current.user?.id).toBe('u1');
    await emit('SIGNED_OUT', null);
    expect(result.current).toEqual({ user: null, provider: null });
    await emit('SIGNED_IN', user('u2', 'apple'));
    expect(result.current.provider).toBe('apple');
  });

  it('keeps the same snapshot object on a token refresh', async () => {
    const { result } = await renderHook(() => useSession());
    await emit('SIGNED_IN', user('u1'));
    const before = result.current;
    await emit('TOKEN_REFRESHED', user('u1'));
    expect(result.current).toBe(before);
    await emit('SIGNED_IN', user('u3'));
    expect(result.current).not.toBe(before);
  });

  it('starts the one auth subscription lazily and only once', async () => {
    expect(mockAuth.onAuthStateChange).not.toHaveBeenCalled();
    await renderHook(() => useSession());
    await renderHook(() => useSession());
    expect(mockAuth.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('keeps auth_user_id in kv in step, and never the email', async () => {
    await renderHook(() => useSession());
    await emit('SIGNED_IN', { ...user('u1'), email: 'ana@example.com' } as ReturnType<typeof user>);
    expect(kvGet(getDb(), 'auth_user_id')).toBe('u1');
    await emit('TOKEN_REFRESHED', user('u1'));
    expect(kvGet(getDb(), 'auth_user_id')).toBe('u1');
    await emit('SIGNED_OUT', null);
    expect(kvGet(getDb(), 'auth_user_id')).toBeNull();
  });
});

describe('onAuthChange', () => {
  it('calls the listener with the new session until unsubscribed', async () => {
    const listener = jest.fn();
    const off = onAuthChange(listener);
    await emit('SIGNED_IN', user('u1', 'apple'));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({ provider: 'apple' });
    off();
    await emit('SIGNED_OUT', null);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
