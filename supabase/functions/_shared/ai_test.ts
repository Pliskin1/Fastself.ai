import {
  CF_API_BASE,
  CF_DEFAULT_MODEL,
  cloudflareProvider,
  getProvider,
  RECIPES_SCHEMA,
  type RawRecipe,
  type SuggestInput,
} from './ai.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEquals<T>(actual: T, expected: T, message = ''): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message} expected ${e}, got ${a}`);
}
async function assertRejects(fn: () => Promise<unknown>, message: string): Promise<Error> {
  try {
    await fn();
  } catch (error) {
    return error as Error;
  }
  throw new Error(message);
}

const ACCOUNT = '0123456789abcdef0123456789abcdef';
const TOKEN = 'cf-secret-token-XYZ';
const INPUT: SuggestInput = {
  forbidden: ['meso', 'mlijecno'],
  avoid: ['orah'],
  meal: 'rucak',
  ingredients: ['krompir'],
  locale: 'sr-Latn',
};
const RECIPE: RawRecipe = {
  title: 'Krompir salata',
  timeMin: 20,
  ingredients: [{ name: 'krompir', category: 'povrce' }],
  steps: ['Skuvaj krompir.', 'Isjeckaj i posoli.'],
};

interface Seen {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
  signal: AbortSignal | null | undefined;
}

/** A fetch that records the request and answers with `reply`. */
function rig(reply: () => Response) {
  const seen: Seen[] = [];
  const fetchImpl = ((input: string | URL | Request, init?: RequestInit) => {
    seen.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)),
      signal: init?.signal,
    });
    return Promise.resolve(reply());
  }) as typeof fetch;
  return { seen, fetchImpl };
}

const ok = (response: unknown) =>
  new Response(JSON.stringify({ success: true, errors: [], messages: [], result: { response } }), { status: 200 });

Deno.test(
  'cloudflare: the request goes to the account and model with the token, the prompt and the schema',
  async () => {
    const { seen, fetchImpl } = rig(() => ok({ recipes: [RECIPE] }));
    const p = cloudflareProvider(ACCOUNT, TOKEN, CF_DEFAULT_MODEL, fetchImpl);
    assertEquals(p.name, 'cloudflare');
    await p.suggest(INPUT, 'Pokušaj ponovo.');

    assertEquals(seen.length, 1);
    const req = seen[0]!;
    assertEquals(req.url, `${CF_API_BASE}/${ACCOUNT}/ai/run/${CF_DEFAULT_MODEL}`);
    assertEquals(req.headers.get('authorization'), `Bearer ${TOKEN}`);
    assertEquals(req.body.max_tokens, 1500);
    assertEquals(req.body.response_format, { type: 'json_schema', json_schema: RECIPES_SCHEMA });
    const messages = req.body.messages as { role: string; content: string }[];
    assertEquals(
      messages.map((m) => m.role),
      ['system', 'user'],
    );
    assert(messages[0]!.content.includes('orah'), 'avoid word missing from the system prompt');
    assert(messages[0]!.content.includes('Kod posta na vodi'), 'the fasting rule is missing from the prompt');
    assert(messages[1]!.content.includes('Pokušaj ponovo.'), 'the retry note is missing');
    assert(req.signal instanceof AbortSignal, 'no abort signal: a stalled call would hang');
    assert(!JSON.stringify(req.body).includes(TOKEN), 'the token is in the body');
  },
);

Deno.test('cloudflare: the answer is read as an object and as a JSON string', async () => {
  for (const response of [{ recipes: [RECIPE] }, JSON.stringify({ recipes: [RECIPE] })]) {
    const { fetchImpl } = rig(() => ok(response));
    const out = await cloudflareProvider(ACCOUNT, TOKEN, CF_DEFAULT_MODEL, fetchImpl).suggest(INPUT);
    assertEquals(out, [RECIPE], typeof response);
  }
});

Deno.test('cloudflare: a non-2xx answer, a failure envelope or an answer without recipes throws', async () => {
  const replies: [string, () => Response][] = [
    ['HTTP 401', () => new Response('{"success":false}', { status: 401 })],
    ['HTTP 500', () => new Response('oops', { status: 500 })],
    [
      'success false',
      () => new Response(JSON.stringify({ success: false, errors: [{ message: "JSON Mode couldn't be met" }] })),
    ],
    ['no result', () => new Response(JSON.stringify({ success: true, result: null }))],
    ['no recipes', () => ok({ meals: [] })],
    ['recipes not a list', () => ok({ recipes: 'none' })],
    ['broken JSON string', () => ok('{"recipes": [')],
  ];
  for (const [label, reply] of replies) {
    const { fetchImpl } = rig(reply);
    const error = await assertRejects(
      () => cloudflareProvider(ACCOUNT, TOKEN, CF_DEFAULT_MODEL, fetchImpl).suggest(INPUT),
      `did not throw on ${label}`,
    );
    assert(!String(error.message).includes(TOKEN), `the token is in the error for ${label}`);
  }
});

Deno.test('cloudflare: a fetch that fails or times out throws', async () => {
  const fetchImpl = (() => Promise.reject(new DOMException('timed out', 'TimeoutError'))) as typeof fetch;
  await assertRejects(
    () => cloudflareProvider(ACCOUNT, TOKEN, CF_DEFAULT_MODEL, fetchImpl).suggest(INPUT),
    'did not throw on a timeout',
  );
});

Deno.test('getProvider: cloudflare is the default and needs both the account id and the token', () => {
  const env = (vars: Record<string, string>) => (name: string) => vars[name];
  assertEquals(getProvider(env({ CF_ACCOUNT_ID: ACCOUNT, CF_API_TOKEN: TOKEN }))?.name, 'cloudflare');
  assertEquals(
    getProvider(env({ AI_PROVIDER: ' Cloudflare ', CF_ACCOUNT_ID: ACCOUNT, CF_API_TOKEN: TOKEN }))?.name,
    'cloudflare',
  );
  assertEquals(getProvider(env({ AI_PROVIDER: 'cloudflare', CF_ACCOUNT_ID: ACCOUNT })), null);
  assertEquals(getProvider(env({ AI_PROVIDER: 'cloudflare', CF_API_TOKEN: TOKEN })), null);
  assertEquals(getProvider(env({ AI_PROVIDER: 'cloudflare', CF_ACCOUNT_ID: ' ', CF_API_TOKEN: TOKEN })), null);
  assertEquals(getProvider(env({})), null);
});

Deno.test(
  'getProvider: CF_AI_MODEL picks the model; anthropic and mock still work; unknown names give null',
  async () => {
    const seen: string[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = ((input: string | URL | Request) => {
      seen.push(String(input));
      return Promise.resolve(ok({ recipes: [RECIPE] }));
    }) as typeof fetch;
    try {
      const p = getProvider(
        (name) =>
          ({ CF_ACCOUNT_ID: ACCOUNT, CF_API_TOKEN: TOKEN, CF_AI_MODEL: '@cf/meta/llama-3.1-8b-instruct' })[name],
      );
      await p!.suggest(INPUT);
      assertEquals(seen, [`${CF_API_BASE}/${ACCOUNT}/ai/run/@cf/meta/llama-3.1-8b-instruct`]);
    } finally {
      globalThis.fetch = realFetch;
    }
    const env = (vars: Record<string, string>) => (name: string) => vars[name];
    assertEquals(getProvider(env({ AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' }))?.name, 'anthropic');
    assertEquals(getProvider(env({ AI_PROVIDER: 'anthropic' })), null);
    assertEquals(getProvider(env({ AI_PROVIDER: 'mock' }))?.name, 'mock');
    assertEquals(getProvider(env({ AI_PROVIDER: 'openai' })), null);
  },
);
