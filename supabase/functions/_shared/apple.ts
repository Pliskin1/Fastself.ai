// Sign in with Apple helpers shared by apple-token and delete-account.
// Nothing here logs. Callers must never log the secret, the code or the refresh token.

export interface AppleConfig {
  teamId: string;
  keyId: string;
  clientId: string;
  /** The .p8 content, PEM, real or literal `\n` newlines. */
  privateKey: string;
}

export const APPLE_AUDIENCE = 'https://appleid.apple.com';
export const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
export const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';
/** Every request to Apple is aborted after this long; an abort ends as the `network` result. */
export const APPLE_TIMEOUT_MS = 8000;

export function readAppleConfig(env: (name: string) => string | undefined): AppleConfig | null {
  const teamId = env('APPLE_TEAM_ID')?.trim();
  const keyId = env('APPLE_KEY_ID')?.trim();
  const privateKey = env('APPLE_PRIVATE_KEY')?.trim();
  const clientId = env('APPLE_CLIENT_ID')?.trim();
  if (!teamId || !keyId || !privateKey || !clientId) return null;
  return { teamId, keyId, clientId, privateKey };
}

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

const utf8 = (s: string) => new TextEncoder().encode(s);

/** PKCS8 PEM (as pasted in an env value) to DER bytes. */
function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replaceAll('\\n', '\n')
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** ES256 client secret JWT valid for 5 minutes. */
export async function appleClientSecret(cfg: AppleConfig, nowSec: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(cfg.privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const header = { alg: 'ES256', kid: cfg.keyId };
  const claims = { iss: cfg.teamId, iat: nowSec, exp: nowSec + 300, aud: APPLE_AUDIENCE, sub: cfg.clientId };
  const input = `${b64url(utf8(JSON.stringify(header)))}.${b64url(utf8(JSON.stringify(claims)))}`;
  // WebCrypto returns raw r||s, which is the JWS ES256 signature form.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(input)));
  return `${input}.${b64url(sig)}`;
}

export type ExchangeResult =
  | { ok: true; refreshToken: string }
  /** `rejected`: Apple answered 4xx (bad or used code). `failed`: network, 5xx or a reply without a refresh token. */
  | { ok: false; kind: 'rejected' | 'failed'; status: number; code: string };

export async function exchangeAuthorizationCode(
  cfg: AppleConfig,
  authorizationCode: string,
  fetchFn: typeof fetch,
  nowSec: number,
): Promise<ExchangeResult> {
  let res: Response;
  try {
    const clientSecret = await appleClientSecret(cfg, nowSec);
    res = await fetchFn(APPLE_TOKEN_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(APPLE_TIMEOUT_MS),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: clientSecret,
        code: authorizationCode,
        grant_type: 'authorization_code',
      }),
    });
  } catch {
    return { ok: false, kind: 'failed', status: 0, code: 'network' };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON reply
  }
  const obj = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};

  if (res.status >= 400 && res.status < 500) {
    const code = typeof obj.error === 'string' && /^[a-z_]{1,40}$/.test(obj.error) ? obj.error : 'rejected';
    return { ok: false, kind: 'rejected', status: res.status, code };
  }
  if (!res.ok) return { ok: false, kind: 'failed', status: res.status, code: 'apple_server' };
  const token = obj.refresh_token;
  if (typeof token !== 'string' || token.length === 0) {
    return { ok: false, kind: 'failed', status: res.status, code: 'no_refresh_token' };
  }
  return { ok: true, refreshToken: token };
}

export type RevokeResult =
  | { ok: true; status: number }
  /**
   * `status` 0: `bad_key` when the client secret could not be signed (nothing was sent), `network` when the request
   * failed or timed out. Otherwise Apple's status with `rejected` (4xx) or `apple_server` (5xx).
   */
  | { ok: false; status: number; code: 'bad_key' | 'network' | 'rejected' | 'apple_server' };

/** Revokes a refresh token (account deletion). Apple answers 200 with an empty body on success. */
export async function revokeRefreshToken(
  cfg: AppleConfig,
  refreshToken: string,
  fetchFn: typeof fetch,
  nowSec: number,
): Promise<RevokeResult> {
  let clientSecret: string;
  try {
    clientSecret = await appleClientSecret(cfg, nowSec);
  } catch {
    return { ok: false, status: 0, code: 'bad_key' };
  }
  let res: Response;
  try {
    res = await fetchFn(APPLE_REVOKE_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(APPLE_TIMEOUT_MS),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: clientSecret,
        token: refreshToken,
        token_type_hint: 'refresh_token',
      }),
    });
  } catch {
    return { ok: false, status: 0, code: 'network' };
  }
  // The body is never read into a result; drain it so the connection is released.
  try {
    await res.body?.cancel();
  } catch {
    // nothing to release
  }
  if (res.ok) return { ok: true, status: res.status };
  return { ok: false, status: res.status, code: res.status < 500 ? 'rejected' : 'apple_server' };
}
