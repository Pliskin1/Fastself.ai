import { createHandler, type Admin } from './handler.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEquals<T>(actual: T, expected: T, message = ''): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message} expected ${e}, got ${a}`);
}

const USER = '11111111-2222-4333-8444-555555555555';
const GOOD = 'good-token';
const CODE = 'c1a2b3-authorization-code-XYZ';
const REFRESH = 'r1-refresh-token-ABC';

async function pemKey(): Promise<string> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  return `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----`;
}

const PEM = await pemKey();
const ENV: Record<string, string> = {
  APPLE_TEAM_ID: 'TEAM123456',
  APPLE_KEY_ID: 'KEY1234567',
  APPLE_PRIVATE_KEY: PEM,
  APPLE_CLIENT_ID: 'ai.fastself.app',
};

interface Rig {
  handler: (req: Request) => Promise<Response>;
  saved: { fn: string; args: Record<string, unknown> }[];
  sent: { url: string; form: URLSearchParams }[];
  logs: string[];
}

function rig(opts: {
  env?: Record<string, string>;
  apple?: () => Response | Promise<Response>;
  rpc?: () => { data: unknown; error: unknown };
}): Rig {
  const saved: Rig['saved'] = [];
  const sent: Rig['sent'] = [];
  const logs: string[] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => void logs.push(a.map(String).join(' '));
  const admin: Admin = {
    auth: {
      getUser: (t) =>
        Promise.resolve(
          t === GOOD
            ? { data: { user: { id: USER } }, error: null }
            : { data: { user: null }, error: { message: 'bad' } },
        ),
    },
    rpc: (fn, args) => {
      saved.push({ fn, args });
      return Promise.resolve(opts.rpc ? opts.rpc() : { data: true, error: null });
    },
  };
  const fetchFn: typeof fetch = async (input, init) => {
    sent.push({ url: String(input), form: new URLSearchParams(String(init?.body)) });
    return opts.apple ? await opts.apple() : Response.json({ refresh_token: REFRESH, access_token: 'a' });
  };
  const handler = createHandler({
    env: (n) => (opts.env ?? ENV)[n],
    fetch: fetchFn,
    admin: () => admin,
    now: () => 1_800_000_000_000,
  });
  // Restore the console after each call so a failing test does not leave it patched.
  return {
    handler: async (req) => {
      try {
        return await handler(req);
      } finally {
        console.error = orig;
      }
    },
    saved,
    sent,
    logs,
  };
}

function post(payload: unknown, token: string | null = GOOD, method = 'POST'): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('http://local/apple-token', {
    method,
    headers,
    body: method === 'POST' ? (typeof payload === 'string' ? payload : JSON.stringify(payload)) : undefined,
  });
}

Deno.test('happy path posts the form to Apple and saves for the verified user', async () => {
  const r = rig({});
  const res = await r.handler(post({ authorizationCode: CODE }));
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true });
  assertEquals(r.sent.length, 1);
  const { url, form } = r.sent[0]!;
  assertEquals(url, 'https://appleid.apple.com/auth/token');
  assertEquals(form.get('client_id'), 'ai.fastself.app');
  assertEquals(form.get('code'), CODE);
  assertEquals(form.get('grant_type'), 'authorization_code');
  assertEquals((form.get('client_secret') ?? '').split('.').length, 3, 'client secret is a JWT');
  assertEquals(r.saved, [{ fn: 'save_apple_token', args: { p_user_id: USER, p_refresh_token: REFRESH } }]);
});

Deno.test('the user id comes from the token, not the body', async () => {
  const r = rig({});
  const res = await r.handler(post({ authorizationCode: CODE, userId: 'other' }));
  assertEquals(res.status, 400);
  assertEquals(r.saved.length, 0);
});

Deno.test('405 for other methods', async () => {
  const res = await rig({}).handler(post({}, GOOD, 'GET'));
  assertEquals(res.status, 405);
});

Deno.test('401 without a bearer token and with a rejected one', async () => {
  for (const token of [null, 'nope']) {
    const r = rig({});
    const res = await r.handler(post({ authorizationCode: CODE }, token));
    assertEquals(res.status, 401);
    assertEquals(await res.json(), { error: 'unauthorized' });
    assertEquals(r.sent.length, 0);
    assertEquals(r.saved.length, 0);
  }
});

Deno.test('400 for bad bodies', async () => {
  const bodies: unknown[] = [
    '{not json',
    {},
    { authorizationCode: '' },
    { authorizationCode: 42 },
    { authorizationCode: 'x'.repeat(2049) },
    { authorizationCode: 'x', extra: 1 },
  ];
  for (const b of bodies) {
    const r = rig({});
    const res = await r.handler(post(b));
    assertEquals(res.status, 400, JSON.stringify(b).slice(0, 40));
    assertEquals(await res.json(), { error: 'invalid_input' });
    assertEquals(r.sent.length, 0);
  }
});

Deno.test('500 server when Apple is not configured', async () => {
  const r = rig({ env: { ...ENV, APPLE_KEY_ID: '' } });
  const res = await r.handler(post({ authorizationCode: CODE }));
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { error: 'server' });
  assertEquals(r.sent.length, 0);
});

Deno.test('Apple invalid_grant gives 400 and saves nothing', async () => {
  const r = rig({ apple: () => Response.json({ error: 'invalid_grant' }, { status: 400 }) });
  const res = await r.handler(post({ authorizationCode: CODE }));
  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: 'invalid_input' });
  assertEquals(r.saved.length, 0);
});

Deno.test('Apple 500, a fetch error and a reply without refresh_token give 500', async () => {
  const cases: (() => Response | Promise<Response>)[] = [
    () => new Response('boom', { status: 500 }),
    () => {
      throw new Error('network down');
    },
    () => Response.json({ access_token: 'a' }),
  ];
  for (const apple of cases) {
    const r = rig({ apple });
    const res = await r.handler(post({ authorizationCode: CODE }));
    assertEquals(res.status, 500);
    assertEquals(r.saved.length, 0);
  }
});

Deno.test('rpc failure gives 500', async () => {
  for (const rpc of [() => ({ data: null, error: { message: 'x' } }), () => ({ data: false, error: null })]) {
    const res = await rig({ rpc }).handler(post({ authorizationCode: CODE }));
    assertEquals(res.status, 500);
  }
});

Deno.test('responses and logs never contain the code, the secret or the refresh token', async () => {
  const outcomes: Rig[] = [];
  const variants = [
    {},
    { apple: () => Response.json({ error: 'invalid_grant', error_description: CODE }, { status: 400 }) },
    { apple: () => new Response(REFRESH, { status: 500 }) },
    { rpc: () => ({ data: null, error: { message: `${REFRESH} ${CODE}` } }) },
    { env: { ...ENV, APPLE_TEAM_ID: '' } },
  ];
  for (const v of variants) {
    const r = rig(v);
    const res = await r.handler(post({ authorizationCode: CODE }));
    const text = await res.text();
    const secret = r.sent[0]?.form.get('client_secret') ?? 'no-secret';
    const all = [text, ...r.logs].join('\n');
    for (const bad of [CODE, REFRESH, secret, USER, GOOD]) {
      assert(!all.includes(bad), `leaked a secret value in variant ${JSON.stringify(Object.keys(v))}`);
    }
    outcomes.push(r);
  }
  assert(
    outcomes.some((o) => o.logs.length > 0),
    'failures are logged',
  );
});
