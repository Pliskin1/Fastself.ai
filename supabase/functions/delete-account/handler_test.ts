import { createHandler, type Admin, type AuthUser } from './handler.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEquals<T>(actual: T, expected: T, message = ''): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message} expected ${e}, got ${a}`);
}

const USER = '11111111-2222-4333-8444-555555555555';
const GOOD = 'good-bearer-token';
/** A token getUser answers without an error but also without a user. */
const NO_USER = 'no-user-token';
const REFRESH = 'r1-refresh-token-ABC';
const REVOKE_URL = 'https://appleid.apple.com/auth/revoke';

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
  rpcs: { fn: string; args: Record<string, unknown> }[];
  deleted: string[];
  sent: { url: string; form: URLSearchParams }[];
  logs: string[];
}

function rig(
  opts: {
    env?: Record<string, string>;
    /** What read_apple_token answers. Default: the user has a token row. */
    rpc?: () => { data: unknown; error: unknown };
    apple?: () => Response | Promise<Response>;
    deleteUser?: () => { error: unknown };
    getUser?: () => never;
    /** deps.admin() throws (the admin client is not configured). */
    adminThrows?: boolean;
    /** app_metadata of the verified user. Default: an email user. */
    meta?: AuthUser['app_metadata'];
  } = {},
): Rig {
  const rpcs: Rig['rpcs'] = [];
  const deleted: string[] = [];
  const sent: Rig['sent'] = [];
  const logs: string[] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => void logs.push(a.map(String).join(' '));
  const admin: Admin = {
    auth: {
      getUser: (t) => {
        if (opts.getUser) opts.getUser();
        return Promise.resolve(
          t === GOOD
            ? {
                data: { user: { id: USER, app_metadata: opts.meta ?? { provider: 'email', providers: ['email'] } } },
                error: null,
              }
            : t === NO_USER
              ? { data: { user: null }, error: null }
              : { data: { user: null }, error: { message: 'bad' } },
        );
      },
      admin: {
        deleteUser: (id) => {
          deleted.push(id);
          return Promise.resolve(opts.deleteUser ? opts.deleteUser() : { error: null });
        },
      },
    },
    rpc: (fn, args) => {
      rpcs.push({ fn, args });
      return Promise.resolve(opts.rpc ? opts.rpc() : { data: REFRESH, error: null });
    },
  };
  const fetchFn: typeof fetch = async (input, init) => {
    sent.push({ url: String(input), form: new URLSearchParams(String(init?.body)) });
    return opts.apple ? await opts.apple() : new Response(null, { status: 200 });
  };
  const handler = createHandler({
    env: (n) => (opts.env ?? ENV)[n],
    fetch: fetchFn,
    admin: () => {
      if (opts.adminThrows) throw new Error('admin client is not configured');
      return admin;
    },
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
    rpcs,
    deleted,
    sent,
    logs,
  };
}

function call(token: string | null = GOOD, method = 'POST'): Request {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('http://local/delete-account', { method, headers });
}

const noToken = () => ({ data: null, error: null });

Deno.test('405 for GET, nothing touched', async () => {
  const r = rig();
  const res = await r.handler(call(GOOD, 'GET'));
  assertEquals(res.status, 405);
  assertEquals(r.rpcs.length + r.deleted.length + r.sent.length, 0);
});

Deno.test('401 with no header, a non-bearer header, a rejected token and a token without a user', async () => {
  const cases: { token: string | null; header?: string }[] = [
    { token: null },
    { token: null, header: `Basic ${GOOD}` },
    { token: 'nope' },
    { token: NO_USER },
  ];
  for (const c of cases) {
    const r = rig();
    const req = c.header
      ? new Request('http://local/delete-account', { method: 'POST', headers: { authorization: c.header } })
      : call(c.token);
    const res = await r.handler(req);
    assertEquals(res.status, 401);
    assertEquals(await res.json(), { error: 'unauthorized' });
    assertEquals(r.rpcs.length + r.deleted.length + r.sent.length, 0, 'nothing touched');
  }
});

Deno.test('500 when the admin client is not configured or getUser throws, logged, nothing touched', async () => {
  const cases: Parameters<typeof rig>[0][] = [
    { adminThrows: true },
    {
      getUser: () => {
        throw new Error('auth down');
      },
    },
  ];
  for (const opts of cases) {
    const r = rig(opts);
    const res = await r.handler(call());
    assertEquals(res.status, 500);
    assertEquals(await res.json(), { error: 'server' });
    assertEquals(r.rpcs.length + r.deleted.length + r.sent.length, 0, 'nothing touched');
    assertEquals(
      r.logs.map((l) => JSON.parse(l)),
      [{ fn: 'delete-account', event: 'auth_check_failed' }],
    );
  }
});

Deno.test('with a token row: one revoke call with the right form, then the user is deleted', async () => {
  const r = rig();
  const res = await r.handler(call());
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true });
  assertEquals(r.rpcs, [{ fn: 'read_apple_token', args: { p_user_id: USER } }]);
  assertEquals(r.sent.length, 1);
  const { url, form } = r.sent[0]!;
  assertEquals(url, REVOKE_URL);
  assertEquals(form.get('client_id'), 'ai.fastself.app');
  assertEquals(form.get('token'), REFRESH);
  assertEquals(form.get('token_type_hint'), 'refresh_token');
  assertEquals((form.get('client_secret') ?? '').split('.').length, 3, 'client secret is a JWT');
  assertEquals(r.deleted, [USER]);
  assert(
    r.logs.some((l) => JSON.parse(l).event === 'apple_revoke' && JSON.parse(l).status === 200),
    'the revoke status is logged',
  );
});

Deno.test('an email user without a token row: no fetch, no log line, the user is deleted', async () => {
  for (const rpc of [noToken, () => ({ data: '', error: null })]) {
    for (const meta of [undefined, {}, { provider: 'email', providers: ['email'] }]) {
      const r = rig({ rpc, meta });
      const res = await r.handler(call());
      assertEquals(res.status, 200);
      assertEquals(await res.json(), { ok: true });
      assertEquals(r.sent.length, 0);
      assertEquals(r.deleted, [USER]);
      assertEquals(r.logs, []);
    }
  }
});

Deno.test(
  'an Apple user without a token row: apple_token_missing is logged, no fetch, the user is deleted',
  async () => {
    const metas: AuthUser['app_metadata'][] = [
      { provider: 'apple', providers: ['apple'] },
      { provider: 'email', providers: ['email', 'apple'] },
    ];
    for (const meta of metas) {
      const r = rig({ rpc: noToken, meta });
      const res = await r.handler(call());
      assertEquals(res.status, 200);
      assertEquals(await res.json(), { ok: true });
      assertEquals(r.sent.length, 0);
      assertEquals(r.deleted, [USER]);
      assertEquals(
        r.logs.map((l) => JSON.parse(l)),
        [{ fn: 'delete-account', event: 'apple_token_missing' }],
      );
    }
  },
);

Deno.test(
  'revoke is best effort: Apple 400, 500, a throwing fetch and a timeout still delete and answer 200',
  async () => {
    const cases: [() => Response | Promise<Response>, number, string | undefined][] = [
      [() => Response.json({ error: 'invalid_client' }, { status: 400 }), 400, 'rejected'],
      [() => new Response('boom', { status: 500 }), 500, 'apple_server'],
      [
        () => {
          throw new Error('network down');
        },
        0,
        'network',
      ],
      [
        () => {
          throw new DOMException('Signal timed out.', 'TimeoutError');
        },
        0,
        'network',
      ],
    ];
    for (const [apple, status, code] of cases) {
      const r = rig({ apple });
      const res = await r.handler(call());
      assertEquals(res.status, 200);
      assertEquals(await res.json(), { ok: true });
      assertEquals(r.sent.length, 1);
      assertEquals(r.deleted, [USER]);
      assertEquals(
        r.logs.map((l) => JSON.parse(l)),
        [{ fn: 'delete-account', event: 'apple_revoke', status, code }],
        `status ${status} is logged`,
      );
    }
  },
);

Deno.test('a broken Apple key: bad_key is logged, nothing is sent, the user is deleted', async () => {
  const r = rig({ env: { ...ENV, APPLE_PRIVATE_KEY: 'not a key' } });
  const res = await r.handler(call());
  assertEquals(res.status, 200);
  assertEquals(r.sent.length, 0);
  assertEquals(r.deleted, [USER]);
  assertEquals(
    r.logs.map((l) => JSON.parse(l)),
    [{ fn: 'delete-account', event: 'apple_revoke', status: 0, code: 'bad_key' }],
  );
});

Deno.test('Apple env missing: logged, no fetch, the user is still deleted', async () => {
  for (const name of Object.keys(ENV)) {
    const r = rig({ env: { ...ENV, [name]: '' } });
    const res = await r.handler(call());
    assertEquals(res.status, 200);
    assertEquals(r.sent.length, 0);
    assertEquals(r.deleted, [USER]);
    assert(
      r.logs.some((l) => JSON.parse(l).event === 'apple_not_configured'),
      'missing config is logged',
    );
  }
});

Deno.test('reading the token fails: 500 and nothing is deleted', async () => {
  const cases: (() => { data: unknown; error: unknown })[] = [
    () => ({ data: null, error: { message: 'x' } }),
    () => {
      throw new Error('db down');
    },
  ];
  for (const rpc of cases) {
    const r = rig({ rpc });
    const res = await r.handler(call());
    assertEquals(res.status, 500);
    assertEquals(await res.json(), { error: 'server' });
    assertEquals(r.sent.length, 0);
    assertEquals(r.deleted.length, 0);
    assert(r.logs.length > 0, 'the failure is logged');
  }
});

Deno.test('deleteUser fails: 500', async () => {
  const cases: (() => { error: unknown })[] = [
    () => ({ error: { message: 'x' } }),
    () => {
      throw new Error('auth down');
    },
  ];
  for (const deleteUser of cases) {
    const r = rig({ deleteUser });
    const res = await r.handler(call());
    assertEquals(res.status, 500);
    assertEquals(await res.json(), { error: 'server' });
    assertEquals(r.deleted, [USER]);
    assert(r.logs.length > 0, 'the failure is logged');
  }
});

Deno.test(
  'responses and logs never contain the refresh token, the client secret, the bearer token or the user id',
  async () => {
    const variants: Parameters<typeof rig>[0][] = [
      {},
      { apple: () => new Response(`${REFRESH} ${USER}`, { status: 400 }) },
      { apple: () => new Response(REFRESH, { status: 500 }) },
      {
        apple: () => {
          throw new Error(`${REFRESH} ${GOOD}`);
        },
      },
      { env: { ...ENV, APPLE_PRIVATE_KEY: '' } },
      { rpc: () => ({ data: null, error: { message: `${REFRESH} ${USER}` } }) },
      { deleteUser: () => ({ error: { message: `${USER} ${GOOD}` } }) },
      { rpc: noToken, meta: { provider: 'apple', providers: ['apple'] } },
      { env: { ...ENV, APPLE_PRIVATE_KEY: `${REFRESH}-not-a-key` } },
      { adminThrows: true },
      {
        getUser: () => {
          throw new Error(`${USER} ${GOOD}`);
        },
      },
    ];
    let logged = 0;
    for (const v of variants) {
      const r = rig(v);
      const res = await r.handler(call());
      const text = await res.text();
      const secret = r.sent[0]?.form.get('client_secret') ?? 'no-secret';
      const all = [text, ...r.logs].join('\n');
      for (const bad of [REFRESH, secret, GOOD, USER]) {
        assert(!all.includes(bad), `leaked a secret value in variant ${JSON.stringify(Object.keys(v ?? {}))}`);
      }
      logged += r.logs.length;
    }
    assert(logged > 0, 'events are logged');
  },
);
