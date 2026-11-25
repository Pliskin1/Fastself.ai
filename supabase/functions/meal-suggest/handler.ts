import { z } from 'jsr:@zod/zod@^4.1';
import type { AiProvider, RawRecipe, SuggestInput } from '../_shared/ai.ts';
import { AI_TIMEOUT_MS } from '../_shared/ai.ts';
import { categorize, CATEGORIES, MEAL_IDS, RECIPES, validateRecipe, type Recipe } from '../_shared/coreApi.ts';
import { errors, json } from '../_shared/json.ts';
import { clientIp, type Limiter } from '../_shared/limits.ts';

const Body = z
  .object({
    forbidden: z.array(z.enum(CATEGORIES)).max(30),
    avoid: z
      .array(
        z
          .string()
          .max(30)
          .regex(/^[\p{L} ]+$/u),
      )
      .max(10),
    meal: z.enum(MEAL_IDS),
    ingredients: z.array(z.string().min(1).max(30)).max(12),
    locale: z.literal('sr-Latn'),
    device: z.uuid(),
    rulePackVersion: z.string().min(1).max(32),
  })
  .strict();

export interface Deps {
  /** null = no usable provider (unknown name, missing key): answer with built-ins. */
  provider: AiProvider | null;
  /** Name reported in the response when `provider` is null. */
  providerName: string;
  limiter: Limiter;
  now?: () => number;
  timeoutMs?: number;
}

interface Rejected {
  title: string;
  reason: string;
}

/** Run `fn` with a deadline. The timer is always cleared. */
function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([fn(), timeout]).finally(() => clearTimeout(timer));
}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Step 4: turn raw AI output into Recipes. The category the AI gives is not trusted: names are categorized too. */
function toRecipe(raw: RawRecipe, i: number, meal: SuggestInput['meal']): Recipe | null {
  if (!raw || !isStr(raw.title) || !Array.isArray(raw.ingredients) || !Array.isArray(raw.steps)) return null;
  const ings = raw.ingredients.filter((g) => g && isStr(g.name));
  const steps = raw.steps.filter(isStr);
  if (ings.length === 0 || steps.length === 0) return null;
  const names = ings.map((g) => g.name.trim());
  const cats = new Set<string>(categorize(names));
  for (const g of ings) if ((CATEGORIES as readonly string[]).includes(g.category)) cats.add(g.category);
  for (const n of names) for (const c of categorize(n)) cats.add(c);
  const timeMin = Number.isFinite(raw.timeMin) ? Math.min(Math.max(Math.round(raw.timeMin), 1), 600) : 30;
  return { id: `ai-${i}`, title: raw.title.trim(), timeMin, meals: [meal], cats: [...cats], ingredients: names, steps };
}

function fallbackRecipes(input: SuggestInput): Recipe[] {
  return RECIPES.filter(
    (r) => r.meals.includes(input.meal) && validateRecipe(r, input.forbidden, input.avoid).length === 0,
  ).slice(0, 3);
}

export function createHandler(deps: Deps): (req: Request) => Promise<Response> {
  const now = deps.now ?? Date.now;
  const timeoutMs = deps.timeoutMs ?? AI_TIMEOUT_MS;

  return async (req) => {
    if (req.method !== 'POST') return errors.methodNotAllowed();

    // 1. validate
    let parsed: z.infer<typeof Body>;
    try {
      const result = Body.safeParse(await req.json());
      if (!result.success) return errors.invalidInput();
      parsed = result.data;
    } catch {
      return errors.invalidInput();
    }

    // 2. rate limit, counted before the provider is called. Any failure here stops the request.
    const started = now();
    try {
      if (!(await deps.limiter.check(clientIp(req), parsed.device))) return errors.rateLimited();
    } catch {
      console.error(JSON.stringify({ fn: 'meal-suggest', event: 'limiter_failed' }));
      return errors.server();
    }

    // The provider sees only these five fields.
    const input: SuggestInput = {
      forbidden: parsed.forbidden,
      avoid: parsed.avoid,
      meal: parsed.meal,
      ingredients: parsed.ingredients,
      locale: parsed.locale,
    };

    // 3 and 4. ask, validate, retry once with the reasons when nothing passes
    const passed: Recipe[] = [];
    const rejected: Rejected[] = [];
    let calls = 0;
    let providerFailed = false;
    let note: string | undefined;
    const provider = deps.provider;

    for (let attempt = 0; provider && attempt < 2 && passed.length === 0 && !providerFailed; attempt++) {
      calls++;
      let raws: RawRecipe[];
      try {
        raws = await withTimeout(() => provider.suggest(input, note), timeoutMs);
      } catch {
        providerFailed = true; // timeout, network or bad response: no retry, built-ins instead
        break;
      }
      const reasons: string[] = [];
      (Array.isArray(raws) ? raws.slice(0, 3) : []).forEach((raw, i) => {
        const recipe = toRecipe(raw, i, parsed.meal);
        if (!recipe) return;
        const why = validateRecipe(recipe, input.forbidden, input.avoid);
        if (why.length === 0) passed.push(recipe);
        else {
          rejected.push({ title: recipe.title, reason: why[0]! });
          reasons.push(...why);
        }
      });
      note = reasons.length ? `Prethodni pokušaj je odbačen: ${reasons.slice(0, 3).join(' ')}` : undefined;
    }

    // 5. fallback
    const fallback = passed.length === 0;
    const recipes = fallback ? fallbackRecipes(input) : passed;

    console.log(
      JSON.stringify({
        fn: 'meal-suggest',
        providerCalls: calls,
        passed: passed.length,
        rejected: rejected.length,
        fallback,
        providerFailed,
        ms: now() - started,
      }),
    );

    return json(200, {
      recipes,
      rejected: rejected.slice(0, 2),
      fallback,
      provider: deps.provider?.name ?? deps.providerName,
    });
  };
}
