import { RecipeSchema, RULE_PACK_VERSION, type Category, type MealId, type Recipe } from '@fastself/core';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { getDb } from '@/db';
import { kvGet } from '@/db/repo/kv';
import * as mock from './api.mock';
import { getSupabase } from './supabase';

// The only network entry point besides supabase.ts (CLAUDE.md rule 2). Contract: docs/API.md §8.
// Every function resolves to an ApiResult and never throws to the UI.

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

/** What the user chose for a suggestion. api.ts adds the locale, this install's id and the rule pack version. */
export type SuggestInput = {
  forbidden: Category[];
  avoid: string[];
  meal: MealId;
  ingredients: string[];
};

export type RejectedRecipe = { title: string; reason: string };

/** The recipes are checked for shape only. The screen still runs `validateRecipe` on each one before showing it. */
export type SuggestData = {
  recipes: Recipe[];
  rejected: RejectedRecipe[];
  fallback: boolean;
  provider: string;
};

export type PlanMealId = Exclude<MealId, 'dorucak'>;

export type MealPlanInput = {
  days: { date: string; forbidden: Category[]; meals: PlanMealId[] }[];
  avoid: string[];
};

export type MealPlanData = {
  days: { date: string; items: { meal: PlanMealId; recipe: Recipe }[] }[];
};

/** The only locale the functions take. It is part of what is sent to the AI. */
export const API_LOCALE = 'sr-Latn';

const TIMEOUT_MS = 10_000;
/** The server may ask the AI twice, 12 s each, before it answers. */
const FUNCTION_TIMEOUT_MS = 30_000;
const PLAN_MEALS: readonly string[] = ['rucak', 'vecera', 'iftar', 'sehur'] satisfies PlanMealId[];

/** True only in a dev build started with EXPO_PUBLIC_API_MOCK=1: api.mock.ts then answers instead of the network. */
const mockOn = (): boolean => __DEV__ && process.env.EXPO_PUBLIC_API_MOCK === '1';

function errorForStatus(status: unknown): ApiError {
  if (status === 429) return 'rate_limited';
  if (status === 400 || status === 409 || status === 422) return 'invalid';
  return 'server';
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `undefined` from a parser means the answer does not match the contract. */
type Parser<T> = (data: unknown) => T | undefined;

function parseRecipe(value: unknown): Recipe | undefined {
  const parsed = RecipeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

const parseSuggest: Parser<SuggestData> = (data) => {
  if (!isObject(data)) return undefined;
  const { recipes, rejected, fallback, provider } = data;
  if (!Array.isArray(recipes) || !Array.isArray(rejected)) return undefined;
  if (typeof fallback !== 'boolean' || typeof provider !== 'string') return undefined;
  const checked: Recipe[] = [];
  for (const item of recipes) {
    const recipe = parseRecipe(item);
    if (!recipe) return undefined;
    checked.push(recipe);
  }
  const dropped: RejectedRecipe[] = [];
  for (const item of rejected) {
    if (!isObject(item) || typeof item.title !== 'string' || typeof item.reason !== 'string') return undefined;
    dropped.push({ title: item.title, reason: item.reason });
  }
  return { recipes: checked, rejected: dropped, fallback, provider };
};

const parsePlan: Parser<MealPlanData> = (data) => {
  if (!isObject(data) || !Array.isArray(data.days)) return undefined;
  const days: MealPlanData['days'] = [];
  for (const day of data.days) {
    if (!isObject(day) || typeof day.date !== 'string' || !Array.isArray(day.items)) return undefined;
    const items: MealPlanData['days'][number]['items'] = [];
    for (const item of day.items) {
      if (!isObject(item) || typeof item.meal !== 'string' || !PLAN_MEALS.includes(item.meal)) return undefined;
      const recipe = parseRecipe(item.recipe);
      if (!recipe) return undefined;
      items.push({ meal: item.meal as PlanMealId, recipe });
    }
    days.push({ date: day.date, items });
  }
  return { days };
};

const parseDone: Parser<null> = (data) => (isObject(data) && data.ok === true ? null : undefined);

/** This install's id. The server hashes it for the daily limit; it never reaches the AI. */
function deviceId(): string {
  const id = kvGet(getDb(), 'install_id');
  if (!id) throw new Error('no install id');
  return id;
}

/**
 * Calls an edge function through the Supabase client, which adds the anon key or the user's session.
 * `body` is built inside the try, so a failure there is an ApiResult too.
 */
async function callFunction<T>(name: string, body: (() => object) | null, parse: Parser<T>): Promise<ApiResult<T>> {
  try {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'server' };
    const options = body ? { body: body(), timeout: FUNCTION_TIMEOUT_MS } : { timeout: FUNCTION_TIMEOUT_MS };
    const { data, error } = await supabase.functions.invoke<unknown>(name, options);
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const response: unknown = error.context;
        return { ok: false, error: errorForStatus(isObject(response) ? response.status : undefined) };
      }
      // A request that did not get through, or one the client stopped at the timeout.
      return { ok: false, error: error instanceof FunctionsFetchError ? 'offline' : 'server' };
    }
    const parsed = parse(data);
    return parsed === undefined ? { ok: false, error: 'server' } : { ok: true, data: parsed };
  } catch {
    return { ok: false, error: 'server' };
  }
}

/**
 * Asks `meal-suggest` for recipes. Call it only after the user gave AI consent. Only the fields named here leave the
 * device, whatever else the caller's object holds.
 */
export function suggestMeals(input: SuggestInput): Promise<ApiResult<SuggestData>> {
  if (mockOn()) return mock.suggestMeals(input);
  return callFunction(
    'meal-suggest',
    () => ({
      forbidden: input.forbidden,
      avoid: input.avoid,
      meal: input.meal,
      ingredients: input.ingredients,
      locale: API_LOCALE,
      device: deviceId(),
      rulePackVersion: RULE_PACK_VERSION,
    }),
    parseSuggest,
  );
}

/** Asks `meal-plan` (P1) for a plan of up to 7 days. Same consent rule as `suggestMeals`. */
export function mealPlan(input: MealPlanInput): Promise<ApiResult<MealPlanData>> {
  if (mockOn()) return mock.mealPlan(input);
  return callFunction(
    'meal-plan',
    () => ({
      days: input.days.map((day) => ({ date: day.date, forbidden: day.forbidden, meals: day.meals })),
      avoid: input.avoid,
      locale: API_LOCALE,
      device: deviceId(),
    }),
    parsePlan,
  );
}

/** Hands Apple's authorization code to `apple-token` after sign-in, so the account can be revoked on delete. */
export function appleToken(authorizationCode: string): Promise<ApiResult<null>> {
  if (mockOn()) return mock.appleToken(authorizationCode);
  return callFunction('apple-token', () => ({ authorizationCode }), parseDone);
}

/** Deletes the signed-in user's account and server data through `delete-account`. */
export function deleteAccount(): Promise<ApiResult<null>> {
  if (mockOn()) return mock.deleteAccount();
  return callFunction('delete-account', null, parseDone);
}

export async function sendReport(input: ReportInput): Promise<ApiResult<null>> {
  if (mockOn()) return mock.sendReport(input);
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
    return { ok: false, error: errorForStatus(res.status) };
  } catch {
    return { ok: false, error: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}
