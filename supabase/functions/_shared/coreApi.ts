// Typed view of the generated bundle ./core.js (built by `pnpm build:edge`, never edited by hand).
import * as core from './core.js';

export type Category = string;
export type MealId = 'dorucak' | 'rucak' | 'vecera' | 'sehur' | 'iftar';
export interface Recipe {
  id: string;
  title: string;
  timeMin: number;
  meals: MealId[];
  cats: Category[];
  ingredients: string[];
  steps: string[];
}

export const CATEGORIES = core.CATEGORIES as unknown as readonly [Category, ...Category[]];
export const MEAL_IDS = core.MEAL_IDS as unknown as readonly [MealId, ...MealId[]];
export const CATEGORY_LABEL = core.CATEGORY_LABEL as Readonly<Record<string, string>>;
export const RECIPES = core.RECIPES as readonly Recipe[];

export const categorize = core.categorize as (texts: string | readonly string[]) => Category[];
export const validateRecipe = core.validateRecipe as (
  r: Pick<Recipe, 'title' | 'cats' | 'ingredients' | 'steps'>,
  forbidden: readonly Category[],
  customAvoid?: readonly string[],
) => string[];
