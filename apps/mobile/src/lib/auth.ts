import type { User } from '@supabase/supabase-js';
import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { getDb } from '@/db';
import { kvDelete, kvGet, kvSet } from '@/db/repo/kv';
import { appleToken } from './api';
import { getSupabase } from './supabase';

// Sign-in, sign-out and the session (docs/API.md §3, §8). All network access goes through the Supabase client from
// supabase.ts. Every function resolves to an AuthResult and never throws to the UI, except `signInApple` called
// off iOS, which is a programming error. Nothing here logs an email, a code, a token or a user id.

export type AuthError =
  | 'cancelled'
  | 'offline'
  | 'rate_limited'
  | 'invalid_email'
  | 'invalid_code'
  | 'expired'
  | 'server'
  | 'invalid_credentials'
  | 'email_taken'
  | 'weak_password'
  | 'confirm_email';
export type AuthResult = { ok: true } | { ok: false; error: AuthError };

export type AuthProvider = 'apple' | 'email';
export type Session = { user: User | null; provider: AuthProvider | null };

/** Shortest password the app accepts (the server allows 6; we ask for more). */
export const MIN_PASSWORD_LENGTH = 8;

/** How long the server keeps an email code valid (Auth setting, docs/API.md §3). */
export const OTP_LIFETIME_SECONDS = 600;

/** Thrown by `signInApple` on any platform other than iOS. Android renders no Apple button. */
export class AppleSignInUnavailableError extends Error {
  constructor() {
    super('Sign in with Apple is only available on iOS');
    this.name = 'AppleSignInUnavailableError';
  }
}

const fail = (error: AuthError): AuthResult => ({ ok: false, error });
const OK: AuthResult = { ok: true };

// --- Error mapping -------------------------------------------------------------------------------------------

/** When this install last sent a code to an email (epoch ms), to tell an expired code from a wrong one. */
const sentAt = new Map<string, number>();

function mapError(error: unknown, step: 'send' | 'verify', email = ''): AuthError {
  // A request that never got an answer: auth-js throws AuthRetryableFetchError with status 0. A 5xx from the
  // server or its gateway is the same class with the HTTP status.
  if (isAuthRetryableFetchError(error)) return error.status === 0 ? 'offline' : 'server';
  if (isAuthApiError(error)) {
    const code: string | undefined = error.code;
    if (error.status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') {
      return 'rate_limited';
    }
    if (code === 'email_address_invalid') return 'invalid_email';
    if (step === 'send' && code === 'validation_failed') return 'invalid_email';
    if (step === 'verify' && code === 'validation_failed') return 'invalid_code';
    if (step === 'verify' && code === 'otp_expired') {
      // GoTrue answers a wrong code and an expired one the same way, so the device tells them apart.
      const sent = sentAt.get(email);
      return sent !== undefined && Date.now() - sent >= OTP_LIFETIME_SECONDS * 1000 ? 'expired' : 'invalid_code';
    }
  }
  return 'server';
}

// --- Session state -------------------------------------------------------------------------------------------

const NO_SESSION: Session = { user: null, provider: null };

let snapshot: Session = NO_SESSION;
const listeners = new Set<() => void>();
let started = false;
let stopAuth: (() => void) | null = null;

const providerOf = (user: User): AuthProvider => (user.app_metadata?.provider === 'apple' ? 'apple' : 'email');

/** Keeps the local `auth_user_id` in step: db/outbox.ts queues writes only while it is set. Never stores the email. */
function syncKv(user: User | null): void {
  try {
    if (user) kvSet(getDb(), 'auth_user_id', user.id);
    else kvDelete(getDb(), 'auth_user_id');
  } catch {
    // The database is not open yet; the next session change writes it.
  }
}

/** Publishes a new snapshot only when the user id or the provider changed, so `useSyncExternalStore` stays quiet. */
function setUser(user: User | null): void {
  const provider = user ? providerOf(user) : null;
  syncKv(user);
  if ((snapshot.user?.id ?? null) === (user?.id ?? null) && snapshot.provider === provider) return;
  snapshot = user ? { user, provider } : NO_SESSION;
  listeners.forEach((listener) => listener());
}

function ensureStarted(): void {
  if (started) return;
  const supabase = getSupabase();
  if (!supabase) return;
  started = true;
  // The callback only updates local state: calling auth methods in it can deadlock auth-js.
  const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
  stopAuth = () => data.subscription.unsubscribe();
}

function subscribe(listener: () => void): () => void {
  ensureStarted();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): Session => snapshot;

/** The signed-in user and how they signed in. `{ user: null, provider: null }` for a guest or a build with no project. */
export function useSession(): Session {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Calls `listener` on every change of user or provider. Returns the unsubscribe function. */
export function onAuthChange(listener: (session: Session) => void): () => void {
  const wrapped = () => listener(snapshot);
  return subscribe(wrapped);
}

/**
 * Whether this phone holds a session, also one that could not be loaded yet: true when `getSession` returns a session
 * or an error (a stored session whose refresh failed, for example offline), false with no client or with neither.
 * When `getSession` throws, whether kv `auth_user_id` is set. `useSession` is a guest until the first auth event,
 * so a screen that must never treat a signed-in user as a guest asks this too. Never throws.
 */
export async function hasStoredSession(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.auth.getSession();
    return !!data.session || !!error;
  } catch {
    try {
      return kvGet(getDb(), 'auth_user_id') !== null;
    } catch {
      return false;
    }
  }
}

/**
 * True only when the server says the user of this session does not exist (`user_not_found`): the account is gone,
 * for example after a delete whose answer never reached the phone. False for anything else: no client, no session,
 * a network error, another error or a user that exists. Never throws.
 */
export async function accountGone(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.auth.getUser();
    return isAuthApiError(error) && error.code === 'user_not_found';
  } catch {
    return false;
  }
}

/** Test only: forgets the subscription, the snapshot and the remembered send times. */
export function resetAuthForTests(): void {
  stopAuth?.();
  stopAuth = null;
  started = false;
  snapshot = NO_SESSION;
  listeners.clear();
  sentAt.clear();
}

// --- Sign in -------------------------------------------------------------------------------------------------

/** Apple sign-in (iOS only). Throws `AppleSignInUnavailableError` anywhere else. */
export async function signInApple(): Promise<AuthResult> {
  if (Platform.OS !== 'ios') throw new AppleSignInUnavailableError();
  const supabase = getSupabase();
  if (!supabase) return fail('server');
  try {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashedNonce,
      });
    } catch (e) {
      return fail((e as { code?: unknown } | null)?.code === 'ERR_REQUEST_CANCELED' ? 'cancelled' : 'server');
    }
    if (!credential.identityToken) return fail('server');
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) return fail(mapError(error, 'verify'));
    // Fire and forget: a failure here never fails the sign-in. It only means the Apple token cannot be revoked later.
    if (credential.authorizationCode) void appleToken(credential.authorizationCode).catch(() => undefined);
    return OK;
  } catch {
    return fail('server');
  }
}

const normalise = (email: string): string => email.trim().toLowerCase();
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sends a 6 digit code to the email. Creates the account on first use. */
export async function sendEmailCode(email: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return fail('server');
  const address = normalise(email);
  if (!EMAIL_SHAPE.test(address)) return fail('invalid_email');
  try {
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
    if (error) return fail(mapError(error, 'send', address));
    sentAt.set(address, Date.now());
    return OK;
  } catch (e) {
    return fail(mapError(e, 'send', address));
  }
}

/** Checks the 6 digit code. On success the client holds the session and `useSession` follows. */
export async function verifyEmailCode(email: string, code: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return fail('server');
  const token = code.trim();
  if (!/^\d{6}$/.test(token)) return fail('invalid_code');
  const address = normalise(email);
  try {
    const { error } = await supabase.auth.verifyOtp({ email: address, token, type: 'email' });
    return error ? fail(mapError(error, 'verify', address)) : OK;
  } catch (e) {
    return fail(mapError(e, 'verify', address));
  }
}

function mapPasswordError(error: unknown): AuthError {
  if (isAuthRetryableFetchError(error)) return error.status === 0 ? 'offline' : 'server';
  if (isAuthApiError(error)) {
    const code: string | undefined = error.code;
    if (error.status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') {
      return 'rate_limited';
    }
    if (code === 'invalid_credentials') return 'invalid_credentials';
    if (code === 'user_already_exists' || code === 'email_exists') return 'email_taken';
    if (code === 'weak_password') return 'weak_password';
    if (code === 'email_address_invalid' || code === 'validation_failed') return 'invalid_email';
    if (code === 'email_not_confirmed') return 'confirm_email';
  }
  return 'server';
}

function checkCredentials(email: string, password: string): AuthError | null {
  if (!EMAIL_SHAPE.test(normalise(email))) return 'invalid_email';
  if (password.length < MIN_PASSWORD_LENGTH) return 'weak_password';
  return null;
}

/**
 * Creates an email + password account and signs in. With email confirmation on in the project the server gives no
 * session; that answers `confirm_email`. The password is never stored or logged here.
 */
export async function signUpWithPassword(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return fail('server');
  const invalid = checkCredentials(email, password);
  if (invalid) return fail(invalid);
  try {
    const { data, error } = await supabase.auth.signUp({ email: normalise(email), password });
    if (error) return fail(mapPasswordError(error));
    // GoTrue answers a sign-up for an existing confirmed email with a user that has no identities.
    if (data.user && data.user.identities?.length === 0) return fail('email_taken');
    return data.session ? OK : fail('confirm_email');
  } catch (e) {
    return fail(mapPasswordError(e));
  }
}

/** Signs in with email + password. On success the client holds the session and `useSession` follows. */
export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return fail('server');
  if (!EMAIL_SHAPE.test(normalise(email))) return fail('invalid_email');
  if (password.length === 0) return fail('invalid_credentials');
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: normalise(email), password });
    return error ? fail(mapPasswordError(error)) : OK;
  } catch (e) {
    return fail(mapPasswordError(e));
  }
}

/**
 * Signs out of this device. `scope: 'local'` makes auth-js remove the stored session before it sends the revoke
 * request (checked in auth-js `_signOut`), so the device is signed out even when that request fails. The default
 * `global` scope keeps the session when the request fails and would also end the user's other devices.
 */
export async function signOut(): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return fail('server');
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // The session is already gone locally; only the revoke request or a listener failed.
  }
  setUser(null);
  return OK;
}
