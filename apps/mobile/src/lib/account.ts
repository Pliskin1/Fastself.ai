import { getDb } from '@/db';
import { consents, type ConsentKind } from '@/db/repo/consents';
import { kvDelete } from '@/db/repo/kv';
import { rescheduleAll } from '@/notifications';
import { resetLocalData } from '@/store/settings';
import { bumpSyncRev, refreshSyncConsent, runWhileSyncIdle, setSyncActivity } from '@/sync';
import { deleteAccount, type ApiError } from './api';
import { signOut } from './auth';
import { clearExportFiles } from './export';

// Deleting the account and wiping the phone (docs/SCREENS.md "brisanje", docs/API.md §4). Both wait for any sync run
// and hold its place while they work, so no run uploads, pulls or saves sync state in the middle. Both sign out
// before they touch local data: a session must never stay without kv `auth_user_id`.

export type DeleteAccountResult = { ok: true } | { ok: false; error: ApiError };

const ALL_CONSENTS: readonly ConsentKind[] = ['ai', 'practices', 'allergies', 'history'];

/**
 * "Obriši nalog": deletes the account and its server data, then signs out and forgets what belonged to the account
 * (the outbox, the sync state, the four consents). The practices, allergies, history and settings stay on the phone;
 * the sheet then asks whether to wipe them too. When the server delete fails nothing on the phone changes.
 * The consents are turned off locally only: the user no longer exists, so nothing is recorded on the server.
 */
export async function deleteAccountAndSignOut(): Promise<DeleteAccountResult> {
  const result = await runWhileSyncIdle(async (): Promise<DeleteAccountResult> => {
    const deleted = await deleteAccount();
    if (!deleted.ok) return { ok: false, error: deleted.error };
    await signOut();
    const db = getDb();
    db.transaction(() => {
      db.run('DELETE FROM outbox');
      kvDelete(db, 'last_sync_at');
      for (const kind of ALL_CONSENTS) consents.set(kind, false);
    });
    return { ok: true };
  });
  if (result.ok) {
    refreshSyncConsent();
    setSyncActivity('idle');
  }
  return result;
}

/**
 * "Obriši podatke sa telefona": signs out (nothing for a guest), then wipes the local database so only `install_id`
 * stays, and drops the pending reminders and the export files. The caller sends the app back to the start route.
 */
export async function wipeDevice(): Promise<void> {
  try {
    await runWhileSyncIdle(async () => {
      await signOut();
      resetLocalData();
    });
  } finally {
    // An export shared earlier is a copy of the wiped data in the cache directory.
    clearExportFiles();
    refreshSyncConsent();
    setSyncActivity('idle');
    bumpSyncRev();
    void rescheduleAll();
  }
}
