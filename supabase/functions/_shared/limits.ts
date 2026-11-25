// Rate limits for AI functions.
// Device: sha256(device + HASH_SALT), counted in private.ai_usage through public.bump_ai_usage (admin role only).
// IP: in-memory bucket per function instance (best effort; the device limit is the durable one).
// The admin client is wired in by the function's index.ts (see defaultLimiter.ts), so this file and its tests
// stay free of the Supabase client.

export const DEVICE_LIMIT = 20;
export const IP_LIMIT = 60;

export type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

export interface Limiter {
  /** true = allowed. Throws when the limiter cannot decide (no salt, database error): the caller must not go on. */
  check(ip: string, device: string, cost?: number): Promise<boolean>;
}

/** Calendar date in Europe/Podgorica, used as the bucket key of the IP limit. */
export function podgoricaDay(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Podgorica' }).format(new Date(ms));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** First address of x-forwarded-for, or 'unknown'. */
export function clientIp(req: Request): string {
  const first = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return first || 'unknown';
}

export interface LimiterOptions {
  rpc: Rpc;
  salt: string | undefined;
  now?: () => number;
  deviceLimit?: number;
  ipLimit?: number;
}

export function createLimiter(opts: LimiterOptions): Limiter {
  const now = opts.now ?? Date.now;
  const deviceLimit = opts.deviceLimit ?? DEVICE_LIMIT;
  const ipLimit = opts.ipLimit ?? IP_LIMIT;
  let bucketDay = '';
  const ipCounts = new Map<string, number>();

  return {
    async check(ip, device, cost = 1) {
      if (!opts.salt) throw new Error('HASH_SALT is not set');

      const day = podgoricaDay(now());
      if (day !== bucketDay) {
        bucketDay = day;
        ipCounts.clear();
      }
      const used = ipCounts.get(ip) ?? 0;
      if (used + cost > ipLimit) return false;

      const hash = await sha256Hex(device + opts.salt);
      const { data, error } = await opts.rpc('bump_ai_usage', {
        p_device_hash: hash,
        p_limit: deviceLimit,
        p_cost: cost,
      });
      if (error || typeof data !== 'boolean') throw new Error('usage counter failed');
      if (!data) return false;

      ipCounts.set(ip, used + cost);
      return true;
    },
  };
}
