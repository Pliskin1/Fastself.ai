import { useEffect } from 'react';
import { AppState } from 'react-native';
import { createStore, useStore, type StoreApi } from 'zustand';
import { getDb } from '@/db';
import { consents } from '@/db/repo/consents';
import { kvGet } from '@/db/repo/kv';
import type { Db } from '@/db/types';
import { onAuthChange, useSession } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { rehydrateSettings } from '@/store/settings';
import { createEngine, deleteServerGroups, type RunResult } from './engine';
import { RemoteError, createSupabaseRemote } from './remote';
import { SYNC_GROUPS, type SyncGroup } from './tables';

// The sync status the UI shows, and when the sync runs. The protocol itself is in engine.ts.

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';
export type SyncResult = { ok: true } | { ok: false; error: 'offline' | 'server' };
export type { SyncGroup } from './tables';
type Activity = Exclude<SyncStatus, 'off'>;

interface SyncState {
  activity: Activity;
  /** True when any of the three sync consents (practices, allergies, history) is on. */
  consented: boolean;
  /** Goes up each time a pull changed local rows. */
  rev: number;
}

const OK: SyncResult = { ok: true };
const TICK_MS = 5000;

let store: StoreApi<SyncState> | undefined;

function readConsented(): boolean {
  // The database is opened at app start; before that nothing is consented.
  try {
    getDb();
  } catch {
    return false;
  }
  return consents.get('practices') || consents.get('allergies') || consents.get('history');
}

function syncStore(): StoreApi<SyncState> {
  store ??= createStore<SyncState>(() => ({ activity: 'idle', consented: readConsented(), rev: 0 }));
  return store;
}

export function setSyncActivity(activity: Activity): void {
  syncStore().setState({ activity });
}

/** Re-reads the three sync consent flags from the local repo. Call after they change. */
export function refreshSyncConsent(): void {
  syncStore().setState({ consented: readConsented() });
}

/** 'off' for a guest or with no sync consent, otherwise what the sync is doing. The first mount starts the sync. */
export function useSyncStatus(): SyncStatus {
  const { user } = useSession();
  const api = syncStore();
  const activity = useStore(api, (s) => s.activity);
  const consented = useStore(api, (s) => s.consented);
  useEffect(() => {
    startSync();
  }, []);
  return user && consented ? activity : 'off';
}

/** A number that goes up when a sync pulled changed rows. Screens that read sessions or the meal plan re-read on it. */
export function useSyncRev(): number {
  return useStore(syncStore(), (s) => s.rev);
}

/** Raises the number `useSyncRev` returns. For callers that changed local rows outside a sync run (a wipe). */
export function bumpSyncRev(): void {
  syncStore().setState((s) => ({ rev: s.rev + 1 }));
}

// --- Runs ---------------------------------------------------------------------------------------------------

/** Bumped by `resetSyncForTests`, so a run left over from an earlier test changes nothing. */
let generation = 0;
let running: Promise<SyncResult> | null = null;
let pending: Promise<SyncResult> | null = null;
/** What the outbox and the profile looked like when the last run started; the tick runs only when they moved. */
let lastAttempt: { seq: number; settingsAt: number | null } = { seq: 0, settingsAt: null };

const maxSeq = (db: Db): number => db.first<{ seq: number | null }>('SELECT MAX(seq) AS seq FROM outbox')?.seq ?? 0;
const settingsAt = (db: Db): number | null =>
  db.first<{ updated_at: number }>("SELECT updated_at FROM kv WHERE key = 'settings'")?.updated_at ?? null;

const failure = (error: unknown): SyncResult => ({
  ok: false,
  error: error instanceof RemoteError && error.kind === 'offline' ? 'offline' : 'server',
});

/**
 * The client and the signed-in user, or null for a guest or a build with no project. Throws when a user is signed in
 * on this phone but the session could not be loaded (for example the token refresh failed with no network): "nothing
 * to do" would then let `deleteServerCopy` report a delete that never reached the server.
 */
async function signedInClient() {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  const userId = data.session?.user.id;
  if (userId) return { client, userId };
  if (error || kvGet(getDb(), 'auth_user_id')) {
    throw new RemoteError(error?.status === 0 ? 'offline' : 'server', 'the session could not be loaded');
  }
  return null;
}

async function runOnce(): Promise<SyncResult> {
  const gen = generation;
  try {
    const db = getDb();
    lastAttempt = { seq: maxSeq(db), settingsAt: settingsAt(db) };
    const session = await signedInClient();
    if (!session || gen !== generation) return OK;
    const groups = SYNC_GROUPS.filter((group) => consents.get(group));
    if (groups.length === 0) return OK;

    setSyncActivity('syncing');
    const remote = createSupabaseRemote(session.client, session.userId);
    // The stores are refreshed as soon as the pull ends, not after the push: a push that fails must not leave the
    // settings store behind what the pull already wrote.
    const onPulled = (pulled: RunResult): void => {
      if (gen !== generation) return;
      if (pulled.settingsChanged) rehydrateSettings();
      if (pulled.rowsChanged) bumpSyncRev();
    };
    // Read live, so a consent turned off while the run is in flight stops that group's uploads.
    const isConsented = (group: SyncGroup): boolean => consents.get(group);
    await createEngine({ db, remote, userId: session.userId, groups, onPulled, isConsented }).run();
    if (gen !== generation) return OK;
    setSyncActivity('idle');
    return OK;
  } catch (error) {
    if (gen === generation) setSyncActivity('error');
    return failure(error);
  }
}

function start(): Promise<SyncResult> {
  const gen = generation;
  const run: Promise<SyncResult> = runOnce().finally(() => {
    if (gen === generation && running === run) running = null;
  });
  running = run;
  return run;
}

/**
 * Runs one sync now: pull, then push. One run at a time; a call during a run queues exactly one more, and every
 * call made during that run gets its result. Does nothing for a guest, without a sync consent or without a client.
 */
export function syncNow(): Promise<SyncResult> {
  if (!running) return start();
  if (!pending) {
    const gen = generation;
    pending = running.then(() => {
      if (gen !== generation) return OK;
      pending = null;
      return running ?? start();
    });
  }
  return pending;
}

let stopSync: (() => void) | null = null;

function tick(): void {
  if (AppState.currentState !== 'active') return;
  let db: Db;
  try {
    db = getDb();
  } catch {
    return;
  }
  if (!kvGet(db, 'auth_user_id')) return;
  if (maxSeq(db) > lastAttempt.seq || settingsAt(db) !== lastAttempt.settingsAt) void syncNow();
}

/**
 * Starts the sync once per app run (more calls return the same stop function): a run now, on every sign-in, on
 * every return to the foreground, and from a 5 s tick while the app is active. The tick runs only when the outbox
 * has an entry newer than the last attempt or the profile changed since it, so a failing run is not repeated.
 */
export function startSync(): () => void {
  if (stopSync) return stopSync;
  void syncNow();
  const offAuth = onAuthChange((session) => {
    if (session.user) void syncNow();
  });
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncNow();
  });
  const timer = setInterval(tick, TICK_MS);
  const stop = () => {
    offAuth();
    appState.remove();
    clearInterval(timer);
    if (stopSync === stop) stopSync = null;
  };
  stopSync = stop;
  return stop;
}

async function deleteOnce(kinds: readonly SyncGroup[]): Promise<SyncResult> {
  try {
    const session = await signedInClient();
    if (!session) return OK;
    const remote = createSupabaseRemote(session.client, session.userId);
    await deleteServerGroups({ db: getDb(), remote, userId: session.userId }, kinds);
    return OK;
  } catch (error) {
    return failure(error);
  }
}

/**
 * Runs `job` once no sync run is in flight or queued, and holds the place of a run while it works: a `syncNow()`
 * asked for meanwhile waits and runs after it. For work that a run in flight could undo or race (a server delete, a
 * sign-out, a wipe). The job's result or rejection goes to the caller, after the place is free again; a rejection
 * never reaches the runs queued behind it. It changes no status, consent flag or tick bookkeeping.
 */
export async function runWhileSyncIdle<T>(job: () => Promise<T>): Promise<T> {
  while (pending ?? running) await (pending ?? running);
  const gen = generation;
  // Called synchronously, so nothing can take the place between the wait and here; a synchronous throw rejects too.
  const work = (async () => job())();
  const slot: Promise<SyncResult> = work
    .then(
      () => OK,
      () => OK,
    )
    .finally(() => {
      if (gen === generation && running === slot) running = null;
    });
  running = slot;
  await slot;
  return work;
}

/**
 * "Obrisati i kopiju na serveru?": deletes the user's server rows of these groups after any running sync. For
 * practices the profile columns are reset and the `profiles` row stays. Turning the consent on again uploads
 * everything. Nothing to do for a guest or without a client.
 * It takes the place of a run while it works, so a sync asked for meanwhile waits: a run in flight would save its
 * own copy of the sync state over the reset made here.
 */
export function deleteServerCopy(kinds: readonly SyncGroup[]): Promise<SyncResult> {
  return runWhileSyncIdle(() => deleteOnce(kinds));
}

/** Test only: stops `startSync`, forgets runs in flight and resets the status. */
export function resetSyncForTests(): void {
  stopSync?.();
  stopSync = null;
  generation++;
  running = null;
  pending = null;
  lastAttempt = { seq: 0, settingsAt: null };
  store?.setState({ activity: 'idle', consented: readConsented(), rev: 0 });
}

/** Test only: resolves once no run is in flight or queued. */
export async function settleSyncForTests(): Promise<void> {
  while (pending ?? running) await (pending ?? running);
}
