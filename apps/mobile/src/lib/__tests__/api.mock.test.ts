import { FORBID, RecipeSchema, validateRecipe, type Category, type MealId } from '@fastself/core';
import * as api from '../api';
import * as mock from '../api.mock';
import type { MealPlanInput, SuggestInput } from '../api';

jest.mock('../supabase', () => ({ getSupabase: () => null }));

const input = (forbidden: readonly Category[], avoid: string[] = [], meal: MealId = 'rucak'): SuggestInput => ({
  forbidden: [...forbidden],
  avoid,
  meal,
  ingredients: [],
});

async function suggest(value: SuggestInput) {
  const result = await mock.suggestMeals(value);
  if (!result.ok) throw new Error('the mock never fails');
  return result.data;
}

describe('api.mock', () => {
  it('exports every function api.ts exports', () => {
    const functions = (module: object) =>
      Object.entries(module)
        .filter(([, value]) => typeof value === 'function')
        .map(([name]) => name)
        .sort();
    expect(functions(mock)).toEqual(functions(api));
  });

  it.each([
    ['a water day', input(FORBID.voda)],
    ['an oil day', input(FORBID.ulje)],
    ['a fish day', input(FORBID.riba, [], 'vecera')],
    ['a day without meat', input(FORBID.bezmesa, [], 'iftar')],
    ['a gluten allergy on a free day', input(['gluten'], [], 'dorucak')],
    ['a category no built-in recipe has', input(['lupina'], [], 'sehur')],
    ['only a custom avoid word', input([], ['paprika'])],
    ['a custom avoid word no built-in recipe has', input([], ['kokos'])],
    ['a fast day with allergies and an avoid word', input([...FORBID.ulje, 'gluten', 'celer'], ['paprika'])],
  ])('gives 3 recipes that pass and 1 with a forbidden food on %s', async (_day, value) => {
    const { recipes, rejected, fallback } = await suggest(value);
    const reasons = recipes.map((recipe) => validateRecipe(recipe, value.forbidden, value.avoid));
    expect(recipes).toHaveLength(4);
    expect(reasons.filter((why) => why.length === 0)).toHaveLength(3);
    expect(reasons.filter((why) => why.length > 0)).toHaveLength(1);
    expect(rejected).toEqual([]);
    expect(fallback).toBe(false);
  });

  it('gives recipes of the real shape, for the asked meal, with ids that do not repeat', async () => {
    const { recipes } = await suggest(input(FORBID.voda, [], 'iftar'));
    for (const recipe of recipes) {
      expect(RecipeSchema.safeParse(recipe).success).toBe(true);
      expect(recipe.meals).toEqual(['iftar']);
    }
    expect(new Set(recipes.map((recipe) => recipe.id)).size).toBe(4);
  });

  it('does not put the forbidden recipe last, so a filter cannot pass by position', async () => {
    const value = input(FORBID.voda);
    const { recipes } = await suggest(value);
    const bad = recipes.findIndex((recipe) => validateRecipe(recipe, value.forbidden, value.avoid).length > 0);
    expect(bad).toBeGreaterThan(-1);
    expect(bad).toBeLessThan(recipes.length - 1);
  });

  it('gives only the 3 recipes when nothing is forbidden that day', async () => {
    const { recipes } = await suggest(input([]));
    expect(recipes).toHaveLength(3);
  });

  it('plans every asked meal with a recipe that passes that day', async () => {
    const plan: MealPlanInput = {
      days: [
        { date: '2026-12-02', forbidden: [...FORBID.voda], meals: ['rucak', 'vecera'] },
        { date: '2026-12-03', forbidden: [...FORBID.riba], meals: ['rucak', 'vecera'] },
        { date: '2027-02-10', forbidden: ['svinjetina', 'alkohol'], meals: ['sehur', 'iftar'] },
      ],
      avoid: ['paprika'],
    };
    const result = await mock.mealPlan(plan);
    if (!result.ok) throw new Error('the mock never fails');
    expect(result.data.days.map((day) => day.date)).toEqual(['2026-12-02', '2026-12-03', '2027-02-10']);
    result.data.days.forEach((day, index) => {
      const asked = plan.days[index]!;
      expect(day.items.map((item) => item.meal)).toEqual(asked.meals);
      for (const { meal, recipe } of day.items) {
        expect(validateRecipe(recipe, asked.forbidden, plan.avoid)).toEqual([]);
        expect(recipe.meals).toContain(meal);
      }
    });
  });

  it('says done for the calls that return nothing', async () => {
    expect(await mock.appleToken('auth-code')).toEqual({ ok: true, data: null });
    expect(await mock.deleteAccount()).toEqual({ ok: true, data: null });
    expect(
      await mock.sendReport({
        type: 'recept',
        day: null,
        context: null,
        message: 'Proba',
        rule_pack_version: '0.1.0',
        app_version: '1.0.0',
      }),
    ).toEqual({ ok: true, data: null });
  });
});
