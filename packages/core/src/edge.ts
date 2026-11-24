// Subset of core bundled for Supabase Edge Functions (pnpm build:edge). Keep it free of Node and React Native APIs,
// and of zod, adhan and the rule pack: only meal data and validation.
export { ALLERGENS, CATEGORIES, CATEGORY_LABEL, DIETS, FORBID, KEYWORDS, MEAL_IDS } from './meals/data';
export { categorize, validateRecipe } from './meals/validate';
export { RECIPES } from './meals/recipes';
export type { AllergenId, Category, FoodLevel, ForbiddenMap, MealId, Recipe } from './types';
