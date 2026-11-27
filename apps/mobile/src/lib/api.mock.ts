import { CATEGORY_LABEL, RECIPES, validateRecipe, type Category, type Recipe } from '@fastself/core';
import type { ApiResult, MealPlanData, MealPlanInput, ReportInput, SuggestData, SuggestInput } from './api';

// Stand-in for api.ts: the same exported functions, no network. api.ts hands every call to it in dev builds started
// with EXPO_PUBLIC_API_MOCK=1, and tests may import it directly. It always answers ok.

/** Long enough to see the loading state on a device. Tests do not wait. */
const DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 700;

async function pause(): Promise<void> {
  if (DELAY_MS > 0) await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
}

const passes = (recipe: Recipe, forbidden: readonly Category[], avoid: readonly string[]): boolean =>
  validateRecipe(recipe, forbidden, avoid).length === 0;

/**
 * A recipe the device has to reject: a built-in one that holds a forbidden food, or a made-up one when no built-in
 * recipe holds any. Null when nothing is forbidden that day and nothing is on the avoid list.
 */
function forbiddenRecipe(input: SuggestInput): Recipe | null {
  const builtIn = RECIPES.find((recipe) => !passes(recipe, input.forbidden, input.avoid));
  if (builtIn) return builtIn;
  const category = input.forbidden[0];
  const food = category ? CATEGORY_LABEL[category] : input.avoid.map((word) => word.trim()).find(Boolean);
  if (!food) return null;
  return {
    id: 'proba',
    title: 'Jelo za probu provjere',
    timeMin: 15,
    meals: [input.meal],
    cats: category ? [category] : [],
    ingredients: [food],
    steps: ['Pomiješaj sastojke i posluži.'],
  };
}

/**
 * 3 built-in recipes that pass the day's rule and the avoid list, and 1 that holds a forbidden food, so the screen's
 * own check with `validateRecipe` has something to drop. Fewer than 3 only when fewer built-in recipes pass.
 */
export async function suggestMeals(input: SuggestInput): Promise<ApiResult<SuggestData>> {
  await pause();
  const allowed = RECIPES.filter((recipe) => passes(recipe, input.forbidden, input.avoid));
  const valid = [
    ...allowed.filter((recipe) => recipe.meals.includes(input.meal)),
    ...allowed.filter((recipe) => !recipe.meals.includes(input.meal)),
  ].slice(0, 3);
  const bad = forbiddenRecipe(input);
  // The forbidden one goes second: a check that only looks at the end of the list must not pass.
  const mixed = bad ? [...valid.slice(0, 1), bad, ...valid.slice(1)] : valid;
  const recipes = mixed.map((recipe, index) => ({ ...recipe, id: `ai-${index}`, meals: [input.meal] }));
  return { ok: true, data: { recipes, rejected: [], fallback: false, provider: 'anthropic' } };
}

/** A built-in recipe that passes the day for every asked meal. Days differ where the recipes allow it. */
export async function mealPlan(input: MealPlanInput): Promise<ApiResult<MealPlanData>> {
  await pause();
  const days = input.days.map((day, dayIndex) => {
    const allowed = RECIPES.filter((recipe) => passes(recipe, day.forbidden, input.avoid));
    const items = day.meals.flatMap((meal, mealIndex) => {
      const forMeal = allowed.filter((recipe) => recipe.meals.includes(meal));
      const recipe = forMeal[(dayIndex + mealIndex) % Math.max(forMeal.length, 1)];
      return recipe ? [{ meal, recipe }] : [];
    });
    return { date: day.date, items };
  });
  return { ok: true, data: { days } };
}

/** The calls that return nothing say done. Each keeps the parameters of its twin in api.ts. */
async function done(): Promise<ApiResult<null>> {
  await pause();
  return { ok: true, data: null };
}

export const appleToken: (authorizationCode: string) => Promise<ApiResult<null>> = done;
export const deleteAccount: () => Promise<ApiResult<null>> = done;
export const sendReport: (input: ReportInput) => Promise<ApiResult<null>> = done;
