import type { FoodLevel, Strictness } from '../types';

export const LEVEL_RANK: Readonly<Record<FoodLevel, number>> = { voda: 4, ulje: 3, riba: 2, bezmesa: 1, mrsno: 0 };

export const LEVEL_TITLE: Readonly<Record<FoodLevel, string>> = {
  voda: 'Post na vodi',
  ulje: 'Post na ulju',
  riba: 'Riba dozvoljena',
  bezmesa: 'Bez mesa',
  mrsno: 'Mrsno',
};

export const LEVEL_SHORT: Readonly<Record<FoodLevel, string>> = {
  voda: 'voda',
  ulje: 'ulje',
  riba: 'riba',
  bezmesa: 'bez mesa',
  mrsno: 'mrsno',
};

/** The stricter of two levels. */
export function stricter(a: FoodLevel, b: FoodLevel): FoodLevel {
  return LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a;
}

/** Applies the user's strictness cap: only ever makes the level milder. */
export function capLevel(level: FoodLevel, strictness: Strictness): FoodLevel {
  return LEVEL_RANK[level] > LEVEL_RANK[strictness] ? strictness : level;
}
