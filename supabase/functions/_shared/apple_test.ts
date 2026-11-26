import { APPLE_REVOKE_URL, appleClientSecret, readAppleConfig, revokeRefreshToken, type AppleConfig } from './apple.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEquals<T>(actual: T, expected: T, message = ''): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message} expected ${e}, got ${a}`);
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replaceAll('-', '+').replaceAll('_', '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function makeKey(): Promise<{ pem: string; pub: CryptoKey }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const b64 = btoa(String.fromCharCode(...der));
  const lines = b64.match(/.{1,64}/g)!.join('\n');
  return { pem: `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`, pub: pair.publicKey };
}

const base = { teamId: 'TEAM123456', keyId: 'KEY1234567', clientId: 'ai.fastself.app' };

async function check(cfg: AppleConfig, pub: CryptoKey) {
  const jwt = await appleClientSecret(cfg, 1_800_000_000);
  const [h, c, s] = jwt.split('.') as [string, string, string];
  const dec = (x: string) => JSON.parse(new TextDecoder().decode(fromB64url(x)));
  assertEquals(dec(h), { alg: 'ES256', kid: 'KEY1234567' }, 'header');
  assertEquals(
    dec(c),
    {
      iss: 'TEAM123456',
      iat: 1_800_000_000,
      exp: 1_800_000_300,
      aud: 'https://appleid.apple.com',
      sub: 'ai.fastself.app',
    },
    'claims',
  );
  const sig = fromB64url(s);
  assertEquals(sig.length, 64, 'raw r||s signature');
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    pub,
    sig,
    new TextEncoder().encode(`${h}.${c}`),
  );
  assert(ok, 'signature verifies with the public key');
}

Deno.test('appleClientSecret signs a valid ES256 JWT from a multi-line PEM', async () => {
  const { pem, pub } = await makeKey();
  await check({ ...base, privateKey: pem }, pub);
});

Deno.test('appleClientSecret accepts a one-line PEM with literal \\n sequences', async () => {
  const { pem, pub } = await makeKey();
  await check({ ...base, privateKey: pem.trim().replaceAll('\n', '\\n') }, pub);
});

Deno.test('readAppleConfig returns the config or null when any name is missing', () => {
  const all: Record<string, string> = {
    APPLE_TEAM_ID: 't',
    APPLE_KEY_ID: 'k',
    APPLE_PRIVATE_KEY: 'p',
    APPLE_CLIENT_ID: 'c',
  };
  assertEquals(
    readAppleConfig((n) => all[n]),
    { teamId: 't', keyId: 'k', clientId: 'c', privateKey: 'p' },
  );
  for (const name of Object.keys(all)) {
    assertEquals(
      readAppleConfig((n) => (n === name ? undefined : all[n])),
      null,
      name,
    );
  }
});

function revokeRig(reply: () => Response | Promise<Response>) {
  const sent: { url: string; method: string; type: string | null; form: URLSearchParams }[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    sent.push({
      url: String(input),
      method: String(init?.method),
      type: new Headers(init?.headers).get('content-type'),
      form: new URLSearchParams(String(init?.body)),
    });
    return await reply();
  };
  return { sent, fetchFn };
}

Deno.test('revokeRefreshToken posts the form to the revoke URL', async () => {
  const { pem, pub } = await makeKey();
  const r = revokeRig(() => new Response(null, { status: 200 }));
  const res = await revokeRefreshToken({ ...base, privateKey: pem }, 'r1-refresh', r.fetchFn, 1_800_000_000);
  assertEquals(res, { ok: true, status: 200 });
  assertEquals(r.sent.length, 1);
  const { url, method, type, form } = r.sent[0]!;
  assertEquals(url, APPLE_REVOKE_URL);
  assertEquals(url, 'https://appleid.apple.com/auth/revoke');
  assertEquals(method, 'POST');
  assertEquals(type, 'application/x-www-form-urlencoded');
  assertEquals([...form.keys()].sort(), ['client_id', 'client_secret', 'token', 'token_type_hint']);
  assertEquals(form.get('client_id'), 'ai.fastself.app');
  assertEquals(form.get('token'), 'r1-refresh');
  assertEquals(form.get('token_type_hint'), 'refresh_token');
  // The client secret is the same signed ES256 JWT the token exchange uses.
  const [h, c, s] = (form.get('client_secret') ?? '').split('.') as [string, string, string];
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    pub,
    fromB64url(s),
    new TextEncoder().encode(`${h}.${c}`),
  );
  assert(ok, 'client secret verifies with the public key');
});

Deno.test('revokeRefreshToken reports 400 and 500 as not ok, with the status', async () => {
  const { pem } = await makeKey();
  const cfg = { ...base, privateKey: pem };
  const bad = await revokeRefreshToken(
    cfg,
    'r',
    revokeRig(() => Response.json({ error: 'invalid_client' }, { status: 400 })).fetchFn,
    1_800_000_000,
  );
  assertEquals(bad, { ok: false, status: 400, code: 'rejected' });
  const down = await revokeRefreshToken(
    cfg,
    'r',
    revokeRig(() => new Response('boom', { status: 500 })).fetchFn,
    1_800_000_000,
  );
  assertEquals(down, { ok: false, status: 500, code: 'apple_server' });
});

Deno.test('revokeRefreshToken turns a throwing fetch into status 0 / network', async () => {
  const { pem } = await makeKey();
  const r = revokeRig(() => {
    throw new Error('network down');
  });
  const res = await revokeRefreshToken({ ...base, privateKey: pem }, 'r', r.fetchFn, 1_800_000_000);
  assertEquals(res, { ok: false, status: 0, code: 'network' });
  assertEquals(r.sent.length, 1);
});

Deno.test('revokeRefreshToken with a key that does not import sends nothing and does not throw', async () => {
  const r = revokeRig(() => new Response(null, { status: 200 }));
  const res = await revokeRefreshToken({ ...base, privateKey: 'not a key' }, 'r', r.fetchFn, 1_800_000_000);
  assertEquals(res, { ok: false, status: 0, code: 'network' });
  assertEquals(r.sent.length, 0);
});
