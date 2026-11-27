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

export type ProviderName = 'anthropic' | 'mock';

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

// ---------------------------------------------------------------- anthropic

export const ANTHROPIC_MODEL = 'claude-haiku-5-5';
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

const TOOL_NAME = 'return_recipes';

const TOOL_SCHEMA = {
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
          messages: [{ role: 'user', content: extraNote ? `Predloži recepte. ${extraNote}` : 'Predloži recepte.' }],
          tools: [{ name: TOOL_NAME, description: 'Vrati 3 recepta.', input_schema: TOOL_SCHEMA }],
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
      const recipes = block?.input?.recipes;
      if (!Array.isArray(recipes)) throw new Error('provider returned no recipes');
      return recipes as RawRecipe[];
    },
  };
}

// ---------------------------------------------------------------- selection

/**
 * Provider from the env. Unknown or unconfigured provider returns null: the caller then serves built-ins
 * (`fallback: true`) instead of crashing. `cloudflare` is not implemented yet and ends up here too.
 */
export function getProvider(env: (name: string) => string | undefined): AiProvider | null {
  const name = (env('AI_PROVIDER') ?? 'anthropic').trim().toLowerCase();
  if (name === 'mock') return mockProvider();
  if (name === 'anthropic') {
    const key = env('ANTHROPIC_API_KEY');
    return key ? anthropicProvider(key) : null;
  }
  return null;
}
