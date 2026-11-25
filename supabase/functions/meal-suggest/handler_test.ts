import { anthropicProvider, mockProvider, MOCK_RECIPES, type AiProvider, type RawRecipe } from '../_shared/ai.ts';
import { validateRecipe } from '../_shared/coreApi.ts';
import { createLimiter, sha256Hex, type Rpc } from '../_shared/limits.ts';
import { createHandler } from './handler.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEquals<T>(actual: T, expected: T, message = ''): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message} expected ${e}, got ${a}`);
}

const DEVICE = '3b241101-e2bb-4255-8caf-4136c566a962';
const VODA = ['meso', 'mlijecno', 'jaja', 'riba', 'ulje', 'vino'];

const body = (over: Record<string, unknown> = {}) => ({
  forbidden: VODA,
  avoid: [],
  meal: 'rucak',
  ingredients: ['krompir'],
  locale: 'sr-Latn',
  device: DEVICE,
  rulePackVersion: 'orthodox.v0.1',
  ...over,
});

function post(payload: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://local/meal-suggest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
}

/** In-memory stand-in for public.bump_ai_usage. */
function fakeRpc(calls: { hash: string; limit: number; cost: number }[] = []): Rpc {
  const counts = new Map<string, number>();
  return (_fn, args) => {
    const hash = args.p_device_hash as string;
    const limit = args.p_limit as number;
    const cost = args.p_cost as number;
    calls.push({ hash, limit, cost });
    const used = counts.get(hash) ?? 0;
    if (used + cost > limit) return Promise.resolve({ data: false, error: null });
    counts.set(hash, used + cost);
    return Promise.resolve({ data: true, error: null });
  };
}

const limiter = () => createLimiter({ rpc: fakeRpc(), salt: 'test-salt' });

const good = (title: string): RawRecipe => ({
  title,
  timeMin: 20,
  ingredients: [{ name: 'krompir', category: 'povrce' }],
  steps: ['Skuvaj krompir u vodi.', 'Posoli.'],
});
const bad = (title: string): RawRecipe => ({
  title,
  timeMin: 20,
  ingredients: [{ name: 'piletina', category: 'meso' }],
  steps: ['Ispeci piletinu.'],
});

function scripted(...responses: (RawRecipe[] | Error)[]): AiProvider & { calls: { input: unknown; note?: string }[] } {
  const calls: { input: unknown; note?: string }[] = [];
  return {
    name: 'mock',
    calls,
    suggest(input, note) {
      calls.push({ input, note });
      const r = responses[Math.min(calls.length - 1, responses.length - 1)]!;
      return r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
    },
  };
}

const handler = (provider: AiProvider | null, lim = limiter()) =>
  createHandler({ provider, providerName: 'anthropic', limiter: lim, timeoutMs: 200 });

// ---------------------------------------------------------------- input validation

Deno.test('invalid input gives 400 invalid_input', async () => {
  const h = handler(mockProvider());
  const cases: Record<string, unknown> = {
    'extra key': body({ name: 'Ana' }),
    'bad meal': body({ meal: 'dorucak2' }),
    'avoid with digits': body({ avoid: ['orah2'] }),
    'long avoid word': body({ avoid: ['a'.repeat(31)] }),
    'too many avoid words': body({ avoid: Array(11).fill('orah') }),
    'too many ingredients': body({ ingredients: Array(13).fill('luk') }),
    'long ingredient': body({ ingredients: ['x'.repeat(31)] }),
    'too many categories': body({ forbidden: Array(31).fill('meso') }),
    'unknown category': body({ forbidden: ['bomba'] }),
    'bad uuid': body({ device: 'not-a-uuid' }),
    'bad locale': body({ locale: 'en' }),
    'missing field': { forbidden: [] },
    'not json': 'nope{',
  };
  for (const [name, payload] of Object.entries(cases)) {
    const res = await h(post(payload));
    assertEquals(res.status, 400, name);
    assertEquals(await res.json(), { error: 'invalid_input' }, name);
  }
});

Deno.test('only POST is accepted', async () => {
  const res = await handler(mockProvider())(new Request('http://local/meal-suggest'));
  assertEquals(res.status, 405);
  await res.body?.cancel();
});

// ---------------------------------------------------------------- rate limits

Deno.test('the 21st call of one device gets 429, another device is unaffected', async () => {
  const h = handler(mockProvider());
  for (let i = 1; i <= 20; i++) {
    const res = await h(post(body(), { 'x-forwarded-for': `10.0.${i}.1` }));
    assertEquals(res.status, 200, `call ${i}`);
    await res.body?.cancel();
  }
  const res = await h(post(body(), { 'x-forwarded-for': '10.0.99.1' }));
  assertEquals(res.status, 429);
  assertEquals(await res.json(), { error: 'rate_limited' });
  const other = await h(post(body({ device: crypto.randomUUID() }), { 'x-forwarded-for': '10.0.99.1' }));
  assertEquals(other.status, 200);
  await other.body?.cancel();
});

Deno.test('the 61st call from one IP gets 429, using the first x-forwarded-for address', async () => {
  const h = handler(mockProvider());
  for (let i = 1; i <= 60; i++) {
    const res = await h(post(body({ device: crypto.randomUUID() }), { 'x-forwarded-for': '203.0.113.7, 10.1.1.1' }));
    assertEquals(res.status, 200, `call ${i}`);
    await res.body?.cancel();
  }
  const res = await h(post(body({ device: crypto.randomUUID() }), { 'x-forwarded-for': '203.0.113.7, 10.9.9.9' }));
  assertEquals(res.status, 429);
  await res.body?.cancel();
  const elsewhere = await h(post(body({ device: crypto.randomUUID() }), { 'x-forwarded-for': '203.0.113.8' }));
  assertEquals(elsewhere.status, 200);
  await elsewhere.body?.cancel();
});

Deno.test('the IP bucket resets on a new Podgorica day', async () => {
  let t = Date.parse('2026-11-25T10:00:00Z');
  const lim = createLimiter({ rpc: fakeRpc(), salt: 's', now: () => t, ipLimit: 2 });
  assert(await lim.check('1.1.1.1', DEVICE), 'first');
  assert(await lim.check('1.1.1.1', DEVICE), 'second');
  assert(!(await lim.check('1.1.1.1', DEVICE)), 'third is limited');
  t += 24 * 3600 * 1000;
  assert(await lim.check('1.1.1.1', DEVICE), 'next day');
});

Deno.test('the device is hashed with the salt before it reaches the database', async () => {
  const calls: { hash: string; limit: number; cost: number }[] = [];
  const lim = createLimiter({ rpc: fakeRpc(calls), salt: 'pepper' });
  await lim.check('1.1.1.1', DEVICE);
  assertEquals(calls[0]!.hash, await sha256Hex(DEVICE + 'pepper'));
  assertEquals([calls[0]!.limit, calls[0]!.cost], [20, 1]);
  assert(!calls[0]!.hash.includes(DEVICE), 'raw device id leaked');
});

Deno.test('a missing HASH_SALT gives 500 and the provider is not called', async () => {
  const provider = scripted([good('a')]);
  const h = handler(provider, createLimiter({ rpc: fakeRpc(), salt: undefined }));
  const res = await h(post(body()));
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { error: 'server' });
  assertEquals(provider.calls.length, 0);
});

Deno.test('a failing counter gives 500 and the provider is not called', async () => {
  const provider = scripted([good('a')]);
  const rpc: Rpc = () => Promise.resolve({ data: null, error: { message: 'db down' } });
  const res = await handler(provider, createLimiter({ rpc, salt: 'x' }))(post(body()));
  assertEquals(res.status, 500);
  assertEquals(provider.calls.length, 0);
});

Deno.test('a rate limited call does not reach the provider', async () => {
  const provider = scripted([good('a')]);
  const lim = createLimiter({ rpc: fakeRpc(), salt: 'x', deviceLimit: 1 });
  const h = handler(provider, lim);
  (await h(post(body()))).body?.cancel();
  const res = await h(post(body()));
  assertEquals(res.status, 429);
  assertEquals(provider.calls.length, 1);
});

// ---------------------------------------------------------------- validation of recipes

Deno.test('1 bad + 2 good recipes give 2 recipes and 1 rejected with a reason', async () => {
  const provider = scripted([bad('Pileće'), good('Prvi'), good('Drugi')]);
  const res = await handler(provider)(post(body()));
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(
    data.recipes.map((r: { title: string }) => r.title),
    ['Prvi', 'Drugi'],
  );
  assertEquals(data.rejected.length, 1);
  assertEquals(data.rejected[0].title, 'Pileće');
  assert(data.rejected[0].reason.length > 0, 'empty reason');
  assertEquals(data.fallback, false);
  assertEquals(provider.calls.length, 1);
  for (const r of data.recipes) assertEquals(validateRecipe(r, VODA, []), []);
});

Deno.test('rejected holds at most 2 entries', async () => {
  const provider = scripted([bad('A'), bad('B'), bad('C')], [good('Dobar')]);
  const data = await (await handler(provider)(post(body()))).json();
  assertEquals(data.recipes.length, 1);
  assert(data.rejected.length <= 2, 'more than 2 rejected');
});

Deno.test('the category the AI gives is not trusted: the ingredient name is categorized too', async () => {
  const lying: RawRecipe = {
    title: 'Lažna salata',
    timeMin: 10,
    ingredients: [{ name: 'sir', category: 'povrce' }],
    steps: ['Pomiješaj.'],
  };
  const provider = scripted([lying, lying, lying], [lying]);
  const data = await (await handler(provider)(post(body({ forbidden: ['mlijecno'] })))).json();
  assertEquals(data.fallback, true);
  assertEquals(data.rejected[0].title, 'Lažna salata');
});

Deno.test('a custom avoid word rejects a recipe', async () => {
  const provider = scripted([good('Krompir'), good('Krompir 2'), good('Krompir 3')], [good('x')]);
  const data = await (await handler(provider)(post(body({ avoid: ['krompir'], forbidden: [] })))).json();
  assertEquals(data.fallback, true);
  for (const r of data.recipes) assertEquals(validateRecipe(r, [], ['krompir']), []);
});

Deno.test('all bad: one retry with the reasons appended, then fallback with built-ins that pass', async () => {
  const provider = scripted([bad('A'), bad('B'), bad('C')]);
  const res = await handler(provider)(post(body()));
  const data = await res.json();
  assertEquals(provider.calls.length, 2);
  assertEquals(provider.calls[0]!.note, undefined);
  assert(!!provider.calls[1]!.note && provider.calls[1]!.note.includes('Sadrži'), 'second call has no reasons');
  assertEquals(data.fallback, true);
  assert(data.recipes.length > 0 && data.recipes.length <= 3, `fallback size ${data.recipes.length}`);
  for (const r of data.recipes) {
    assertEquals(validateRecipe(r, VODA, []), [], r.id);
    assert(r.meals.includes('rucak'), 'built-in does not fit the meal');
  }
  assert(data.rejected.length <= 2, 'rejected over 2');
});

Deno.test('the retry result is used when it passes', async () => {
  const provider = scripted([bad('A')], [good('Dobar')]);
  const data = await (await handler(provider)(post(body()))).json();
  assertEquals(provider.calls.length, 2);
  assertEquals(data.fallback, false);
  assertEquals(
    data.recipes.map((r: { title: string }) => r.title),
    ['Dobar'],
  );
});

// ---------------------------------------------------------------- provider failures

Deno.test('a provider that throws gives fallback without a retry', async () => {
  const provider = scripted(new Error('boom'));
  const res = await handler(provider)(post(body()));
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.fallback, true);
  assertEquals(provider.calls.length, 1);
  assert(data.recipes.length > 0, 'no built-ins');
});

Deno.test('a provider timeout gives fallback', async () => {
  const hanging: AiProvider = { name: 'anthropic', suggest: () => new Promise(() => {}) };
  const data = await (await handler(hanging)(post(body()))).json();
  assertEquals(data.fallback, true);
  assertEquals(data.provider, 'anthropic');
});

Deno.test('an unknown or unconfigured provider gives fallback with built-ins', async () => {
  const data = await (await handler(null)(post(body()))).json();
  assertEquals(data.fallback, true);
  assert(data.recipes.length > 0, 'no built-ins');
  assertEquals(data.provider, 'anthropic');
});

Deno.test('malformed provider output is dropped, not a crash', async () => {
  const junk = [null, { title: 5 }, { title: 'x', ingredients: 'a', steps: [] }] as unknown as RawRecipe[];
  const data = await (await handler(scripted(junk))(post(body()))).json();
  assertEquals(data.fallback, true);
});

// ---------------------------------------------------------------- privacy

Deno.test('the provider input has exactly the five allowed keys and no device id or IP', async () => {
  const provider = scripted([good('a')]);
  const res = await handler(provider)(post(body({ avoid: ['orah'] }), { 'x-forwarded-for': '198.51.100.23' }));
  await res.body?.cancel();
  const call = provider.calls[0]!;
  assertEquals(Object.keys(call.input as object).sort(), ['avoid', 'forbidden', 'ingredients', 'locale', 'meal']);
  const text = JSON.stringify(call);
  assert(!text.includes(DEVICE), 'device id reached the provider');
  assert(!text.includes('198.51.100.23'), 'IP reached the provider');
  assert(!text.includes('orah2') && !text.includes('orthodox'), 'unexpected field');
});

Deno.test('the logs hold no payload content', async () => {
  const lines: string[] = [];
  const log = console.log;
  console.log = (...a: unknown[]) => lines.push(a.join(' '));
  try {
    const res = await handler(scripted([good('Tajni naslov')]))(
      post(body({ avoid: ['tajnarijec'], ingredients: ['tajnisastojak'] }), {
        'x-forwarded-for': '198.51.100.24',
      }),
    );
    await res.body?.cancel();
  } finally {
    console.log = log;
  }
  const all = lines.join('\n');
  assert(all.includes('meal-suggest'), 'nothing was logged');
  for (const secret of [DEVICE, '198.51.100.24', 'tajnisastojak', 'Tajni naslov', 'tajnarijec']) {
    assert(!all.includes(secret), `log contains ${secret}`);
  }
});

// ---------------------------------------------------------------- providers

Deno.test('the mock provider has one recipe that fails a fasting day and two that pass', () => {
  const verdicts = MOCK_RECIPES.map(
    (r) =>
      validateRecipe(
        {
          title: r.title,
          cats: r.ingredients.map((i) => i.category),
          ingredients: r.ingredients.map((i) => i.name),
          steps: r.steps,
        },
        VODA,
      ).length === 0,
  );
  assertEquals(verdicts, [false, true, true]);
});

Deno.test('the Anthropic provider sends the documented request and reads the tool_use block', async () => {
  let seen: { url: string; headers: Headers; body: Record<string, unknown> } | undefined;
  const fakeFetch = ((url: string, init: RequestInit) => {
    seen = { url, headers: new Headers(init.headers), body: JSON.parse(init.body as string) };
    return Promise.resolve(
      new Response(
        JSON.stringify({ content: [{ type: 'text' }, { type: 'tool_use', input: { recipes: [good('A')] } }] }),
        {
          status: 200,
        },
      ),
    );
  }) as unknown as typeof fetch;
  const p = anthropicProvider('test-key', fakeFetch);
  const out = await p.suggest(
    { forbidden: ['meso'], avoid: ['orah'], meal: 'rucak', ingredients: ['krompir'], locale: 'sr-Latn' },
    'Pokušaj ponovo.',
  );
  assertEquals(out.length, 1);
  assertEquals(seen!.url, 'https://api.anthropic.com/v1/messages');
  assertEquals(seen!.headers.get('x-api-key'), 'test-key');
  assertEquals(seen!.headers.get('anthropic-version'), '2023-06-01');
  assertEquals(seen!.body.model, 'claude-haiku-5-5');
  assertEquals(seen!.body.tool_choice, { type: 'tool', name: 'return_recipes' });
  // claude-haiku-5-5 rejects non-default sampling parameters with a 400.
  for (const key of ['temperature', 'top_p', 'top_k']) assert(!(key in seen!.body), `${key} is in the request`);
  assert((seen!.body.system as string).includes('orah'), 'avoid word missing from the prompt');
  assert(!JSON.stringify(seen!.body).includes(DEVICE), 'device id in the request');
});

Deno.test('the Anthropic provider throws on a refusal and on a reply cut at max_tokens', async () => {
  for (const stop_reason of ['refusal', 'max_tokens']) {
    const body = JSON.stringify({ stop_reason, content: [{ type: 'tool_use', input: { recipes: [good('A')] } }] });
    const p = anthropicProvider('k', (() =>
      Promise.resolve(new Response(body, { status: 200 }))) as unknown as typeof fetch);
    let threw = false;
    try {
      await p.suggest({ forbidden: [], avoid: [], meal: 'rucak', ingredients: [], locale: 'sr-Latn' });
    } catch {
      threw = true;
    }
    assert(threw, `did not throw on ${stop_reason}`);
  }
});

Deno.test('the Anthropic provider throws on a non-200 answer', async () => {
  const p = anthropicProvider('k', (() =>
    Promise.resolve(new Response('{}', { status: 529 }))) as unknown as typeof fetch);
  let threw = false;
  try {
    await p.suggest({ forbidden: [], avoid: [], meal: 'rucak', ingredients: [], locale: 'sr-Latn' });
  } catch {
    threw = true;
  }
  assert(threw, 'did not throw');
});
