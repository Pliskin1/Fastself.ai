// AI provider behind one interface. The input holds only what API.md allows: forbidden categories, avoid words,
// meal, chosen ingredients and locale. Never add a device id, IP, user id or anything else here.
import { CATEGORIES, CATEGORY_LABEL, type Category, type MealId } from './coreApi.ts';

export interface SuggestInput {
  forbidden: Category[];
  avoid: string[];
  meal: MealId;
  ingredients: string[];
  locale: 'sr-Latn';
}

export interface RawRecipe {
  title: string;
  timeMin: number;
  ingredients: { name: string; category: Category }[];
  steps: string[];
}

export type ProviderName = 'cloudflare' | 'anthropic' | 'mock';

/** Used when `AI_PROVIDER` is not set. Cloudflare Workers AI is the v1.0 provider (docs/SPEC.md). */
export const DEFAULT_PROVIDER: ProviderName = 'cloudflare';

export interface AiProvider {
  readonly name: ProviderName;
  suggest(input: SuggestInput, extraNote?: string): Promise<RawRecipe[]>;
}

// ---------------------------------------------------------------- mock

/** Fixtures for local runs and tests: one recipe with meat (dropped on any fasting day) and two plant-based ones. */
export const MOCK_RECIPES: RawRecipe[] = [
  {
    title: 'Piletina sa krompirom',
    timeMin: 45,
    ingredients: [
      { name: 'piletina', category: 'meso' },
      { name: 'krompir', category: 'povrce' },
    ],
    steps: ['Ispeci piletinu u šerpi.', 'Dodaj krompir i kuvaj dok ne omekša.'],
  },
  {
    title: 'Čorba od povrća',
    timeMin: 30,
    ingredients: [
      { name: 'šargarepa', category: 'povrce' },
      { name: 'krompir', category: 'povrce' },
      { name: 'luk', category: 'povrce' },
    ],
    steps: ['Isjeckaj povrće.', 'Kuvaj povrće u vodi 20 minuta.', 'Posoli i služi toplo.'],
  },
  {
    title: 'Salata od paradajza i krastavca',
    timeMin: 10,
    ingredients: [
      { name: 'paradajz', category: 'povrce' },
      { name: 'krastavac', category: 'povrce' },
    ],
    steps: ['Isjeckaj paradajz i krastavac.', 'Pomiješaj i posoli.'],
  },
];

export function mockProvider(): AiProvider {
  return {
    name: 'mock',
    suggest: () => Promise.resolve(structuredClone(MOCK_RECIPES)),
  };
}

// ---------------------------------------------------------------- shared by the real providers

export const AI_TIMEOUT_MS = 12_000;

export function buildSystemPrompt(input: SuggestInput): string {
  const forbidden = input.forbidden.map((c) => CATEGORY_LABEL[c] ?? c).join(', ') || 'ništa';
  const avoid = input.avoid.join(', ') || 'ništa';
  const ingredients = input.ingredients.join(', ') || 'bilo šta';
  return [
    'Ti si kuvar iz Crne Gore. Predloži 3 jednostavna domaća recepta na crnogorskom (ijekavica, latinica).',
    `Strogo zabranjeno u sastojcima i koracima: ${forbidden}. Izbjegavaj i: ${avoid}.`,
    `Obrok: ${input.meal}. Koristi koliko možeš: ${ingredients}. Bez mesnih zamjena koje kriju zabranjene sastojke.`,
    'Kod posta na vodi ne koristi ulje ni u jednom koraku. Svaki recept 3–5 koraka, vrijeme u minutama.',
    'Ne daj zdravstvene savjete.',
  ].join('\n');
}

const userMessage = (extraNote?: string): string =>
  extraNote ? `Predloži recepte. ${extraNote}` : 'Predloži recepte.';

/** The JSON schema of the answer: `{ recipes: RawRecipe[3] }`. */
export const RECIPES_SCHEMA = {
  type: 'object',
  properties: {
    recipes: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          timeMin: { type: 'integer' },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, category: { type: 'string', enum: [...CATEGORIES] } },
              required: ['name', 'category'],
            },
          },
          steps: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'timeMin', 'ingredients', 'steps'],
      },
    },
  },
  required: ['recipes'],
};

/** `{ recipes: [...] }` as an object or as a JSON string; anything else throws. */
function readRecipes(value: unknown): RawRecipe[] {
  const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  const recipes = parsed && typeof parsed === 'object' ? (parsed as { recipes?: unknown }).recipes : undefined;
  if (!Array.isArray(recipes)) throw new Error('provider returned no recipes');
  return recipes as RawRecipe[];
}

// ---------------------------------------------------------------- cloudflare

/** A Workers AI model with JSON mode (developers.cloudflare.com/workers-ai/features/json-mode). */
export const CF_DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const CF_API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

/**
 * Cloudflare Workers AI over REST, with the answer constrained to `RECIPES_SCHEMA` (JSON mode). Any failure throws,
 * and meal-suggest then serves built-in recipes. Errors carry only the HTTP status, never the token.
 */
export function cloudflareProvider(
  accountId: string,
  token: string,
  model: string = CF_DEFAULT_MODEL,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = AI_TIMEOUT_MS,
): AiProvider {
  return {
    name: 'cloudflare',
    async suggest(input, extraNote) {
      const res = await fetchImpl(`${CF_API_BASE}/${encodeURIComponent(accountId)}/ai/run/${model}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: buildSystemPrompt(input) },
            { role: 'user', content: `${userMessage(extraNote)} Odgovori samo JSON objektom sa poljem recipes.` },
          ],
          // The default is 256 tokens, too few for three recipes.
          max_tokens: 1500,
          response_format: { type: 'json_schema', json_schema: RECIPES_SCHEMA },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        await res.body?.cancel();
        throw new Error(`provider status ${res.status}`);
      }
      const data = (await res.json()) as { success?: unknown; result?: { response?: unknown } | null };
      if (data.success !== true) throw new Error('provider reported a failure');
      return readRecipes(data.result?.response);
    },
  };
}

// ---------------------------------------------------------------- anthropic

export const ANTHROPIC_MODEL = 'claude-haiku-5-5';
const TOOL_NAME = 'return_recipes';

export function anthropicProvider(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = AI_TIMEOUT_MS,
): AiProvider {
  return {
    name: 'anthropic',
    async suggest(input, extraNote) {
      const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        // No temperature, top_p or top_k: claude-haiku-5-5 answers 400 to any non-default sampling value.
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1500,
          system: buildSystemPrompt(input),
          messages: [{ role: 'user', content: userMessage(extraNote) }],
          tools: [{ name: TOOL_NAME, description: 'Vrati 3 recepta.', input_schema: RECIPES_SCHEMA }],
          tool_choice: { type: 'tool', name: TOOL_NAME },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        await res.body?.cancel();
        throw new Error(`provider status ${res.status}`);
      }
      const data = (await res.json()) as {
        stop_reason?: string;
        content?: { type: string; input?: { recipes?: unknown } }[];
      };
      // A refusal has no tool call, and a reply cut at max_tokens can hold half a recipe: use neither.
      if (data.stop_reason === 'refusal' || data.stop_reason === 'max_tokens') {
        throw new Error(`provider stopped: ${data.stop_reason}`);
      }
      const block = data.content?.find((c) => c.type === 'tool_use');
      return readRecipes(block?.input);
    },
  };
}

// ---------------------------------------------------------------- selection

/**
 * Provider from the env. Unknown or unconfigured provider returns null: the caller then serves built-ins
 * (`fallback: true`) instead of crashing. Cloudflare needs `CF_ACCOUNT_ID` and `CF_API_TOKEN`; `CF_AI_MODEL`
 * optionally picks another Workers AI model with JSON mode.
 */
export function getProvider(env: (name: string) => string | undefined): AiProvider | null {
  const name = (env('AI_PROVIDER') ?? DEFAULT_PROVIDER).trim().toLowerCase();
  if (name === 'mock') return mockProvider();
  if (name === 'cloudflare') {
    const accountId = env('CF_ACCOUNT_ID')?.trim();
    const token = env('CF_API_TOKEN')?.trim();
    if (!accountId || !token) return null;
    return cloudflareProvider(accountId, token, env('CF_AI_MODEL')?.trim() || CF_DEFAULT_MODEL);
  }
  if (name === 'anthropic') {
    const key = env('ANTHROPIC_API_KEY');
    return key ? anthropicProvider(key) : null;
  }
  return null;
}
