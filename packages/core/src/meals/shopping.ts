import type { DayNum, MealId, Recipe } from '../types';

export interface PlanMeal {
  meal: MealId;
  recipe: Pick<Recipe, 'id' | 'title' | 'ingredients'>;
}
export interface PlanDay {
  n: DayNum;
  meals: readonly PlanMeal[];
}
export interface ShoppingItem {
  name: string;
  /** Number of meals that use it. */
  count: number;
  /** Ids of the recipes that use it (unique). */
  recipes: string[];
}

/** Aggregates ingredients over a plan, counting meals, sorted by name (sr-Latn). */
export function shoppingList(days: readonly PlanDay[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const day of days) {
    for (const { recipe } of day.meals) {
      for (const raw of new Set(recipe.ingredients.map((i) => i.trim().toLowerCase()))) {
        if (!raw) continue;
        const item = map.get(raw) ?? { name: raw, count: 0, recipes: [] };
        item.count += 1;
        if (!item.recipes.includes(recipe.id)) item.recipes.push(recipe.id);
        map.set(raw, item);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'sr-Latn'));
}
