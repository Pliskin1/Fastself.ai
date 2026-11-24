// Smoke test for the edge bundle that `pnpm build:edge` writes to ./core.js.
// The functions validate every recipe with it, so a broken or empty bundle must fail here.
import { FORBID, RECIPES, validateRecipe } from './core.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const chicken = {
  id: 'test-piletina',
  title: 'Piletina sa povrćem',
  timeMin: 30,
  meals: ['rucak'],
  cats: ['meso', 'povrce'],
  ingredients: ['piletina', 'šargarepa'],
  steps: ['Ispeci piletinu.', 'Dodaj šargarepu.'],
};

Deno.test('the bundle exports the validator, the levels and the built-in recipes', () => {
  assert(typeof validateRecipe === 'function', 'validateRecipe is not exported');
  assert(Array.isArray(FORBID.voda) && FORBID.voda.includes('meso'), 'FORBID.voda does not forbid meat');
  assert(Array.isArray(RECIPES) && RECIPES.length > 0, 'RECIPES is empty');
});

Deno.test('a recipe with meat is rejected on a fasting day and accepted on a free day', () => {
  assert(validateRecipe(chicken, FORBID.voda).length > 0, 'meat passed on a water day');
  assert(validateRecipe(chicken, FORBID.bezmesa).length > 0, 'meat passed on a no-meat day');
  assert(validateRecipe(chicken, FORBID.mrsno).length === 0, 'meat was rejected on a free day');
});

Deno.test('a custom avoid word rejects a recipe that contains it', () => {
  assert(validateRecipe(chicken, FORBID.mrsno, ['šargarepa']).length === 1, 'the avoid word was not found');
});

Deno.test('the built-in bean soup passes the strictest level', () => {
  const soup = RECIPES.find((r: { id: string }) => r.id === 'corba');
  assert(soup, 'recipe "corba" is missing from the bundle');
  const reasons = validateRecipe(soup, FORBID.voda);
  assert(reasons.length === 0, `bean soup was rejected: ${reasons.join(' ')}`);
});
