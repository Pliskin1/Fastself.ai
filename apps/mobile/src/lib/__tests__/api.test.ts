import { FORBID, RECIPES, RULE_PACK_VERSION } from '@fastself/core';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { getDb } from '@/db';
import { kvGet } from '@/db/repo/kv';
import { installTestDb } from '@/test/utils';
import {
  appleToken,
  deleteAccount,
  mealPlan,
  sendReport,
  suggestMeals,
  type MealPlanInput,
  type ReportInput,
  type SuggestInput,
} from '../api';

const mockInvoke = jest.fn();
let mockClient: { functions: { invoke: jest.Mock } } | null = null;
jest.mock('../supabase', () => ({ getSupabase: () => mockClient }));

const INPUT: ReportInput = {
  type: 'pravilo',
  day: '2026-12-02',
  context: 'danas',
  message: 'Pogrešno pravilo',
  rule_pack_version: '0.1.0',
  app_version: '1.0.0',
};

const SUGGEST: SuggestInput = {
  forbidden: [...FORBID.ulje],
  avoid: ['paprika'],
  meal: 'rucak',
  ingredients: ['krompir', 'luk'],
};

const PLAN: MealPlanInput = {
  days: [
    { date: '2026-12-02', forbidden: [...FORBID.voda], meals: ['rucak', 'vecera'] },
    { date: '2026-12-03', forbidden: [], meals: ['sehur', 'iftar'] },
  ],
  avoid: ['paprika'],
};

const RECIPE = RECIPES[0]!;
const SUGGEST_BODY = {
  recipes: [RECIPE, RECIPES[1]!],
  rejected: [{ title: 'Pita sa sirom', reason: 'Sadrži mliječne proizvode.' }],
  fallback: false,
  provider: 'anthropic',
};
const PLAN_BODY = {
  days: [
    {
      date: '2026-12-02',
      items: [
        { meal: 'rucak', recipe: RECIPE },
        { meal: 'vecera', recipe: RECIPES[1]! },
      ],
    },
    { date: '2026-12-03', items: [] },
  ],
};

const answer = (data: unknown) => ({ data, error: null });
const fail = (error: unknown) => ({ data: null, error });
const http = (status: number) => fail(new FunctionsHttpError({ status }));

const setDev = (value: boolean): void => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = value;
};

// Expo's Babel plugin turns every read of process.env.EXPO_PUBLIC_* into a read of the one env object it took when
// the file loaded. So the tests change that object in place and never swap process.env for a copy.
const ENV_KEYS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_API_MOCK'];
const ORIGINAL_ENV = ENV_KEYS.map((key) => process.env[key]);

function restoreEnv(): void {
  ENV_KEYS.forEach((key, index) => {
    const value = ORIGINAL_ENV[index];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
}

const fetchMock = jest.fn();

beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.test';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  delete process.env.EXPO_PUBLIC_API_MOCK;
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  mockInvoke.mockReset();
  mockClient = { functions: { invoke: mockInvoke } };
  installTestDb();
});

afterEach(() => {
  restoreEnv();
  setDev(true);
  jest.useRealTimers();
});

describe('sendReport', () => {
  it('posts the row to /rest/v1/reports without asking for it back', async () => {
    fetchMock.mockResolvedValue({ status: 201 });
    expect(await sendReport(INPUT)).toEqual({ ok: true, data: null });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.supabase.test/rest/v1/reports');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      apikey: 'anon-key',
      Authorization: 'Bearer anon-key',
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    });
    expect(url).not.toContain('select');
    expect(Object.keys(JSON.parse(init.body as string) as object).sort()).toEqual(
      ['app_version', 'context', 'day', 'message', 'rule_pack_version', 'type'].sort(),
    );
  });

  it.each([
    [200, true],
    [204, true],
    [429, 'rate_limited'],
    [400, 'invalid'],
    [409, 'invalid'],
    [422, 'invalid'],
    [401, 'server'],
    [403, 'server'],
    [500, 'server'],
    [503, 'server'],
  ])('maps status %i', async (status, expected) => {
    fetchMock.mockResolvedValue({ status });
    const result = await sendReport(INPUT);
    if (expected === true) expect(result).toEqual({ ok: true, data: null });
    else expect(result).toEqual({ ok: false, error: expected });
  });

  it('gives offline when fetch throws', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    expect(await sendReport(INPUT)).toEqual({ ok: false, error: 'offline' });
  });

  it('gives offline when the request is aborted after the timeout', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const pending = sendReport(INPUT);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(await pending).toEqual({ ok: false, error: 'offline' });
  });

  it('gives server and does not call fetch when an env value is missing', async () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(await sendReport(INPUT)).toEqual({ ok: false, error: 'server' });
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.test';
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(await sendReport(INPUT)).toEqual({ ok: false, error: 'server' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// The four edge function calls share one path, so every error branch is checked for each of them.
describe.each([
  ['suggestMeals', 'meal-suggest', () => suggestMeals(SUGGEST), SUGGEST_BODY, SUGGEST_BODY],
  ['mealPlan', 'meal-plan', () => mealPlan(PLAN), PLAN_BODY, PLAN_BODY],
  ['appleToken', 'apple-token', () => appleToken('auth-code'), { ok: true }, null],
  ['deleteAccount', 'delete-account', () => deleteAccount(), { ok: true }, null],
])('%s', (_name, fn, call, body, data) => {
  it(`calls ${fn} once, with a timeout, and returns the checked answer`, async () => {
    mockInvoke.mockResolvedValue(answer(body));
    expect(await call()).toEqual({ ok: true, data });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const [name, options] = mockInvoke.mock.calls[0] as [string, { timeout: number }];
    expect(name).toBe(fn);
    expect(options.timeout).toBe(30_000);
  });

  it.each([
    ['offline', 'the network fails or the timeout passes', fail(new FunctionsFetchError(new TypeError('failed')))],
    ['rate_limited', 'the server answers 429', http(429)],
    ['invalid', 'the server answers 400', http(400)],
    ['invalid', 'the server answers 422', http(422)],
    ['server', 'the server answers 500', http(500)],
    ['server', 'the server answers 401', http(401)],
    ['server', 'the function is not deployed (404)', http(404)],
    ['server', 'the relay fails', fail(new FunctionsRelayError({ status: 500 }))],
    ['server', 'the error is of an unknown kind', fail(new Error('boom'))],
    ['server', 'the answer is 200 but empty', answer(null)],
    ['server', 'the answer is 200 but not the contract', answer({ hello: 'world' })],
  ])('gives %s when %s', async (error, _when, result) => {
    mockInvoke.mockResolvedValue(result);
    expect(await call()).toEqual({ ok: false, error });
  });

  it('gives server and never throws when the client itself throws', async () => {
    mockInvoke.mockRejectedValue(new Error('boom'));
    expect(await call()).toEqual({ ok: false, error: 'server' });
  });

  it('gives server without a call when the build has no Supabase client', async () => {
    mockClient = null;
    expect(await call()).toEqual({ ok: false, error: 'server' });
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('suggestMeals', () => {
  it('sends only the contract fields, with this install and the rule pack version', async () => {
    mockInvoke.mockResolvedValue(answer(SUGGEST_BODY));
    const leaky = { ...SUGGEST, name: 'Marko', city: 'Podgorica', practices: ['orthodox'] } as SuggestInput;
    await suggestMeals(leaky);
    const [, options] = mockInvoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(options.body).toEqual({
      forbidden: SUGGEST.forbidden,
      avoid: ['paprika'],
      meal: 'rucak',
      ingredients: ['krompir', 'luk'],
      locale: 'sr-Latn',
      device: kvGet(getDb(), 'install_id'),
      rulePackVersion: RULE_PACK_VERSION,
    });
    expect(options.body.device).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('accepts the built-in fallback answer with no recipes rejected', async () => {
    const body = { recipes: [], rejected: [], fallback: true, provider: 'cloudflare' };
    mockInvoke.mockResolvedValue(answer(body));
    expect(await suggestMeals(SUGGEST)).toEqual({ ok: true, data: body });
  });

  it.each([
    ['recipes is not a list', { ...SUGGEST_BODY, recipes: 'none' }],
    ['a recipe has no steps', { ...SUGGEST_BODY, recipes: [{ ...RECIPE, steps: [] }] }],
    ['a recipe has an unknown category', { ...SUGGEST_BODY, recipes: [{ ...RECIPE, cats: ['cokolada'] }] }],
    ['a recipe is not an object', { ...SUGGEST_BODY, recipes: [RECIPE, 'corba'] }],
    ['rejected is missing', { ...SUGGEST_BODY, rejected: undefined }],
    ['a rejected item has no reason', { ...SUGGEST_BODY, rejected: [{ title: 'Pita' }] }],
    ['fallback is not a boolean', { ...SUGGEST_BODY, fallback: 'no' }],
    ['provider is missing', { ...SUGGEST_BODY, provider: undefined }],
  ])('gives server when %s', async (_when, body) => {
    mockInvoke.mockResolvedValue(answer(body));
    expect(await suggestMeals(SUGGEST)).toEqual({ ok: false, error: 'server' });
  });
});

describe('mealPlan', () => {
  it('sends only the contract fields of the plan and of each day', async () => {
    mockInvoke.mockResolvedValue(answer(PLAN_BODY));
    const leaky = {
      ...PLAN,
      days: PLAN.days.map((day) => ({ ...day, practice: 'ramadan' })),
      email: 'marko@example.test',
    } as MealPlanInput;
    await mealPlan(leaky);
    const [, options] = mockInvoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(options.body).toEqual({
      days: PLAN.days,
      avoid: ['paprika'],
      locale: 'sr-Latn',
      device: kvGet(getDb(), 'install_id'),
    });
  });

  it.each([
    ['days is not a list', { days: {} }],
    ['a day has no date', { days: [{ items: [] }] }],
    ['items is not a list', { days: [{ date: '2026-12-02', items: null }] }],
    ['a meal is not a plan meal', { days: [{ date: '2026-12-02', items: [{ meal: 'dorucak', recipe: RECIPE }] }] }],
    ['a recipe is broken', { days: [{ date: '2026-12-02', items: [{ meal: 'rucak', recipe: { title: 'x' } }] }] }],
  ])('gives server when %s', async (_when, body) => {
    mockInvoke.mockResolvedValue(answer(body));
    expect(await mealPlan(PLAN)).toEqual({ ok: false, error: 'server' });
  });
});

describe('appleToken and deleteAccount', () => {
  it('appleToken sends only the authorization code', async () => {
    mockInvoke.mockResolvedValue(answer({ ok: true }));
    await appleToken('auth-code');
    expect(mockInvoke).toHaveBeenCalledWith('apple-token', {
      body: { authorizationCode: 'auth-code' },
      timeout: 30_000,
    });
  });

  it('deleteAccount sends no body: the server reads the user from the session', async () => {
    mockInvoke.mockResolvedValue(answer({ ok: true }));
    await deleteAccount();
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', { timeout: 30_000 });
  });

  it('a 200 that does not say ok is not taken as done', async () => {
    mockInvoke.mockResolvedValue(answer({ ok: false }));
    expect(await deleteAccount()).toEqual({ ok: false, error: 'server' });
    expect(await appleToken('auth-code')).toEqual({ ok: false, error: 'server' });
  });
});

describe('EXPO_PUBLIC_API_MOCK', () => {
  it('answers from the mock, with no network, in a dev build started with the flag', async () => {
    process.env.EXPO_PUBLIC_API_MOCK = '1';
    const suggested = await suggestMeals(SUGGEST);
    expect(suggested.ok && suggested.data.recipes).toHaveLength(4);
    const planned = await mealPlan(PLAN);
    expect(planned.ok && planned.data.days.map((day) => day.date)).toEqual(['2026-12-02', '2026-12-03']);
    expect(await appleToken('auth-code')).toEqual({ ok: true, data: null });
    expect(await deleteAccount()).toEqual({ ok: true, data: null });
    expect(await sendReport(INPUT)).toEqual({ ok: true, data: null });
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is ignored for any other value of the flag', async () => {
    process.env.EXPO_PUBLIC_API_MOCK = 'true';
    mockInvoke.mockResolvedValue(answer(SUGGEST_BODY));
    expect(await suggestMeals(SUGGEST)).toEqual({ ok: true, data: SUGGEST_BODY });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('is ignored in a production build even when the flag is set', async () => {
    process.env.EXPO_PUBLIC_API_MOCK = '1';
    setDev(false);
    mockInvoke.mockResolvedValue(answer(SUGGEST_BODY));
    fetchMock.mockResolvedValue({ status: 201 });
    expect(await suggestMeals(SUGGEST)).toEqual({ ok: true, data: SUGGEST_BODY });
    expect(await sendReport(INPUT)).toEqual({ ok: true, data: null });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
