import type { Category, ForbiddenMap, Recipe } from '../types';
import { CATEGORIES, CATEGORY_LABEL, KEYWORDS } from './data';

/** Words that look like a keyword but are not food in the forbidden sense (grating verbs, currants). */
const NOT_FOOD = ['narib', 'izrib', 'ribiz'];

/** Lowercase, drop "bez ulja", punctuation to spaces. Returns the words joined and padded with spaces. */
export function normalize(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/bez\s+ulja/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !NOT_FOOD.some((p) => w.startsWith(p)));
  return ` ${words.join(' ')} `;
}

function matches(padded: string, kw: string): boolean {
  const start = kw.startsWith('^');
  const end = kw.endsWith('$');
  const core = kw.slice(start ? 1 : 0, end ? -1 : undefined);
  return padded.includes(`${start ? ' ' : ''}${core}${end ? ' ' : ''}`);
}

function hitsCategory(padded: string, cat: Category): boolean {
  const kws = KEYWORDS[cat];
  return !!kws && kws.some((k) => matches(padded, k));
}

/** Categories whose keywords appear in the texts (ingredients, steps, title). */
export function categorize(texts: string | readonly string[]): Category[] {
  const padded = normalize(typeof texts === 'string' ? texts : texts.join(' '));
  return CATEGORIES.filter((c) => hitsCategory(padded, c));
}

/**
 * Reasons why a recipe is not allowed (empty = OK). `forbidden` is a ForbiddenMap, or a plain category
 * list (the server only has a list), which gets neutral reason texts.
 */
export function validateRecipe(
  r: Pick<Recipe, 'title' | 'cats' | 'ingredients' | 'steps'>,
  forbidden: ForbiddenMap | readonly Category[],
  customAvoid: readonly string[] = [],
): string[] {
  const reasons: string[] = [];
  const entries: [Category, ForbiddenMap[Category]][] = Array.isArray(forbidden)
    ? (forbidden as readonly Category[]).map((c) => [c, undefined])
    : (Object.entries(forbidden) as [Category, ForbiddenMap[Category]][]);
  const stepsPadded = r.steps.map(normalize);
  const allPadded = normalize([r.title, ...r.ingredients, ...r.steps].join(' . '));

  for (const [cat, f] of entries) {
    let hit = r.cats.includes(cat);
    let where = '';
    for (let i = 0; i < r.steps.length && !where; i++) {
      if (hitsCategory(stepsPadded[i]!, cat)) {
        where = `korak ${i + 1}: „${r.steps[i]!.replace(/\.$/, '')}”`;
        hit = true;
      }
    }
    if (!hit) hit = hitsCategory(allPadded, cat);
    if (!hit) continue;
    const label = CATEGORY_LABEL[cat];
    if (!f) reasons.push(`Sadrži ${label}${where ? ` (${where})` : ''}.`);
    else if (f.src === 'alergija') reasons.push(`Sadrži ${label}, a to je na tvojoj listi alergija.`);
    else if (f.src === 'dijeta') reasons.push(`Sadrži ${label}, što ne ide uz izabranu dijetu.`);
    else reasons.push(`Sadrži ${label}${where ? ` (${where})` : ''}, a danas je ${f.label}.`);
  }
  for (const word of customAvoid) {
    const w = word.trim().toLowerCase();
    if (w && allPadded.includes(w)) reasons.push(`Sadrži „${word}”, a to je na tvojoj listi alergija.`);
  }
  return reasons;
}
