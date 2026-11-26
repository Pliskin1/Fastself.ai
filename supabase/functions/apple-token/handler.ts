import { z } from 'jsr:@zod/zod@^4.1';
import { exchangeAuthorizationCode, readAppleConfig } from '../_shared/apple.ts';
import { errors, json } from '../_shared/json.ts';

const Body = z.object({ authorizationCode: z.string().min(1).max(2048) }).strict();

/** The slice of the admin client this function uses. */
export interface Admin {
  auth: { getUser(token: string): Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

export interface Deps {
  env: (name: string) => string | undefined;
  fetch: typeof fetch;
  admin: () => Admin;
  now?: () => number;
}

const log = (event: string, extra: Record<string, unknown> = {}) =>
  console.error(JSON.stringify({ fn: 'apple-token', event, ...extra }));

export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  const now = deps.now ?? Date.now;

  return async (req) => {
    if (req.method !== 'POST') return errors.methodNotAllowed();

    // Verify the caller whatever the gateway did. The user id comes only from here.
    const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '');
    if (!match) return errors.unauthorized();
    let userId: string;
    let admin: Admin;
    try {
      admin = deps.admin();
      const { data, error } = await admin.auth.getUser(match[1]!);
      if (error || !data?.user?.id) return errors.unauthorized();
      userId = data.user.id;
    } catch {
      return errors.unauthorized();
    }

    let code: string;
    try {
      const result = Body.safeParse(await req.json());
      if (!result.success) return errors.invalidInput();
      code = result.data.authorizationCode;
    } catch {
      return errors.invalidInput();
    }

    const cfg = readAppleConfig(deps.env);
    if (!cfg) {
      log('not_configured');
      return errors.server();
    }

    const ex = await exchangeAuthorizationCode(cfg, code, deps.fetch, Math.floor(now() / 1000));
    if (!ex.ok) {
      log('apple_failed', { status: ex.status, code: ex.code });
      return ex.kind === 'rejected' ? errors.invalidInput() : errors.server();
    }

    try {
      const { data, error } = await admin.rpc('save_apple_token', {
        p_user_id: userId,
        p_refresh_token: ex.refreshToken,
      });
      if (error || data !== true) {
        log('save_failed');
        return errors.server();
      }
    } catch {
      log('save_failed');
      return errors.server();
    }
    return json(200, { ok: true });
  };
}
