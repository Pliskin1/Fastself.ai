import type { Recipe } from '../types';
import data from './recipes.sr.json';

/** The built-in recipes (Montenegrin). Every one must pass validateRecipe before it is shown. */
export const RECIPES: readonly Recipe[] = data as Recipe[];
