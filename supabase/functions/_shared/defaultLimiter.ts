// Real wiring of the rate limiter: admin client (RPC into public.bump_ai_usage) and the HASH_SALT secret.
import { createLimiter, type Limiter } from './limits.ts';
import { getAdmin } from './supabaseAdmin.ts';

export function createDefaultLimiter(): Limiter {
  return createLimiter({
    rpc: (fn, args) => getAdmin().rpc(fn, args),
    salt: Deno.env.get('HASH_SALT'),
  });
}
