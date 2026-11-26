import { createStore, useStore, type StoreApi } from 'zustand';
import { getDb } from '@/db';
import { consents } from '@/db/repo/consents';
import { useSession } from '@/lib/auth';

// The sync status the UI shows. T18 builds the real sync on top: it reports through `setSyncActivity`.

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';
type Activity = Exclude<SyncStatus, 'off'>;

interface SyncState {
  activity: Activity;
  /** True when any of the three sync consents (practices, allergies, history) is on. */
  consented: boolean;
}

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
  store ??= createStore<SyncState>(() => ({ activity: 'idle', consented: readConsented() }));
  return store;
}

export function setSyncActivity(activity: Activity): void {
  syncStore().setState({ activity });
}

/** Re-reads the three sync consent flags from the local repo. Call after they change. */
export function refreshSyncConsent(): void {
  syncStore().setState({ consented: readConsented() });
}

/** 'off' for a guest or with no sync consent, otherwise what the sync is doing. */
export function useSyncStatus(): SyncStatus {
  const { user } = useSession();
  const api = syncStore();
  const activity = useStore(api, (s) => s.activity);
  const consented = useStore(api, (s) => s.consented);
  return user && consented ? activity : 'off';
}
