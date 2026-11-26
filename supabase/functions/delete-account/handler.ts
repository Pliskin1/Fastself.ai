import { readAppleConfig, revokeRefreshToken } from '../_shared/apple.ts';
import { errors, json } from '../_shared/json.ts';

// POST delete-account (docs/API.md §4): revoke the Sign in with Apple token if there is one, then delete the user.
// Profiles cascade to every user table, reports keep the row with user_id null, private.apple_tokens cascades.

/** The verified user, as much of it as this function reads. */
export interface AuthUser {
  id: string;
  app_metadata?: { provider?: unknown; providers?: unknown };
}

/** The slice of the admin client this function uses. */
export interface Admin {
  auth: {
    getUser(token: string): Promise<{ data: { user: AuthUser | null }; error: unknown }>;
    admin: { deleteUser(id: string): Promise<{ error: unknown }> };
  };
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

export interface Deps {
  env: (name: string) => string | undefined;
  fetch: typeof fetch;
  admin: () => Admin;
  now?: () => number;
}

// Never log the refresh token, the client secret, the bearer token or the user id.
const log = (event: string, extra: Record<string, unknown> = {}) =>
  console.error(JSON.stringify({ fn: 'delete-account', event, ...extra }));

/** True when the user ever signed in with Apple (then a token row is expected). */
function signedInWithApple(user: AuthUser): boolean {
  const meta = user.app_metadata;
  return meta?.provider === 'apple' || (Array.isArray(meta?.providers) && meta.providers.includes('apple'));
}

export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  const now = deps.now ?? Date.now;

  return async (req) => {
    if (req.method !== 'POST') return errors.methodNotAllowed();

    // Verify the caller whatever the gateway did. The user id comes only from here.
    const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '');
    if (!match) return errors.unauthorized();
    let user: AuthUser;
    let admin: Admin;
    try {
      admin = deps.admin();
      const { data, error } = await admin.auth.getUser(match[1]!);
      if (error || !data?.user?.id) return errors.unauthorized();
      user = data.user;
    } catch {
      // The admin client is not configured or the auth service failed: that is our fault, not the caller's.
      log('auth_check_failed');
      return errors.server();
    }
    const userId = user.id;

    // Read the Apple token before the delete: the row cascades away with the user.
    let refreshToken: string | null = null;
    try {
      const { data, error } = await admin.rpc('read_apple_token', { p_user_id: userId });
      if (error) {
        log('read_token_failed');
        return errors.server();
      }
      if (typeof data === 'string' && data.length > 0) refreshToken = data;
    } catch {
      log('read_token_failed');
      return errors.server();
    }

    // Best effort: whatever Apple answers, the account is still deleted.
    if (refreshToken) {
      const cfg = readAppleConfig(deps.env);
      if (!cfg) {
        log('apple_not_configured');
      } else {
        const res = await revokeRefreshToken(cfg, refreshToken, deps.fetch, Math.floor(now() / 1000));
        log('apple_revoke', res.ok ? { status: res.status } : { status: res.status, code: res.code });
      }
    } else if (signedInWithApple(user)) {
      // An Apple user without a stored token cannot be revoked here; note it and still delete.
      log('apple_token_missing');
    }

    try {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) {
        log('delete_failed');
        return errors.server();
      }
    } catch {
      log('delete_failed');
      return errors.server();
    }
    return json(200, { ok: true });
  };
}
