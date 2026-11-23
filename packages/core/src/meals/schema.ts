import { z } from 'zod';
import { CATEGORIES, MEAL_IDS } from './data';

export const RecipeSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  timeMin: z.number().int().positive(),
  meals: z.array(z.enum(MEAL_IDS)).min(1),
  cats: z.array(z.enum(CATEGORIES)),
  ingredients: z.array(z.string().min(1)).min(1),
  steps: z.array(z.string().min(1)).min(1),
});
