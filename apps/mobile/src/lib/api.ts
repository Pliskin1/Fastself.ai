// The only network entry point besides supabase.ts (CLAUDE.md rule 2). T10 adds sendReport; the rest comes in T14.

export type ApiError = 'offline' | 'rate_limited' | 'server' | 'invalid';
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export type ReportType = 'pravilo' | 'vrijeme' | 'recept' | 'drugo';

/** One row of `reports`. Nothing else is ever sent: no name, location, practices or user id. */
export type ReportInput = {
  type: ReportType;
  day: string | null;
  context: string | null;
  message: string;
  rule_pack_version: string;
  app_version: string;
};

const TIMEOUT_MS = 10_000;

export async function sendReport(input: ReportInput): Promise<ApiResult<null>> {
  // Static dot access: Expo inlines only literal process.env.EXPO_PUBLIC_* reads.
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, error: 'server' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/rest/v1/reports`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (res.status >= 200 && res.status < 300) return { ok: true, data: null };
    if (res.status === 429) return { ok: false, error: 'rate_limited' };
    if (res.status === 400 || res.status === 409 || res.status === 422) return { ok: false, error: 'invalid' };
    return { ok: false, error: 'server' };
  } catch {
    return { ok: false, error: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}
