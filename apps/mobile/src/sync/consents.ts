import { consents, type ConsentKind } from '@/db/repo/consents';
import { getSupabase } from '@/lib/supabase';
import { refreshSyncConsent } from './index';

// Bump when docs/legal/privacy.md changes what is collected.
export const POLICY_VERSION = '1';

/** Local kind to the server's `consents.kind`. */
const SERVER_KIND: Record<ConsentKind, string> = {
  ai: 'ai',
  practices: 'sync_practices',
  allergies: 'sync_allergies',
  history: 'sync_history',
};

export type SetConsentsResult = { ok: true } | { ok: false; error: 'offline' | 'server' };

/**
 * Saves consent changes. The phone is the source of truth, so the local flags are written first. A signed-in user
 * also gets one append-only row per change on the server; a failure there leaves the local flags as written.
 * Only the kind, the flag and the policy version are sent.
 */
export async function setConsents(changes: Partial<Record<ConsentKind, boolean>>): Promise<SetConsentsResult> {
  const entries = (Object.entries(changes) as [ConsentKind, boolean | undefined][]).filter(
    (entry): entry is [ConsentKind, boolean] => entry[1] !== undefined,
  );
  for (const [kind, on] of entries) consents.set(kind, on);
  refreshSyncConsent();

  try {
    const supabase = getSupabase();
    if (!supabase || entries.length === 0) return { ok: true };
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return { ok: true };
    const rows = entries.map(([kind, granted]) => ({
      user_id: userId,
      kind: SERVER_KIND[kind],
      granted,
      policy_version: POLICY_VERSION,
    }));
    const { error, status } = await supabase.from('consents').insert(rows);
    if (!error) return { ok: true };
    return { ok: false, error: status === 0 ? 'offline' : 'server' };
  } catch {
    return { ok: false, error: 'server' };
  }
}
