import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as core from '../src/index';
import * as edge from '../src/edge';
import type { CityId, DayPlan, FoodLevel, Recipe, Settings } from '../src/index';

// Compile-time check that the frozen types exist.
export type _Frozen = [Settings, DayPlan, FoodLevel, Recipe, CityId];

describe('public exports (docs/team/ANDREJ.md)', () => {
  it.each([
    'dayPlan',
    'rangeStats',
    'nextSlava',
    'forbiddenFor',
    'validateRecipe',
    'skyColors',
    'sunAltitude',
    'moonPhase',
    'pl',
    'toDayNum',
    'fromDayNum',
  ])('%s is a function', (name) => {
    expect(typeof (core as Record<string, unknown>)[name]).toBe('function');
  });
  it('also exports the additive helpers', () => {
    for (const name of [
      'orthodoxRule',
      'prayerTimes',
      'closestCity',
      'nextDays',
      'categorize',
      'shoppingList',
      'parseSettings',
      'moonPath',
      'isoDate',
      'parseIsoDate',
      'monthGrid',
      'localFromEpoch',
      'epochFromLocal',
    ]) {
      expect(typeof (core as Record<string, unknown>)[name], name).toBe('function');
    }
    expect(core.RECIPES).toHaveLength(18);
    expect(core.DEFAULT_SETTINGS.city).toBe('podgorica');
  });
});

describe('edge subset', () => {
  it('exposes only the meal data and validation', () => {
    expect(Object.keys(edge).sort()).toEqual(
      [
        'ALLERGENS',
        'CATEGORIES',
        'CATEGORY_LABEL',
        'DIETS',
        'FORBID',
        'KEYWORDS',
        'MEAL_IDS',
        'RECIPES',
        'categorize',
        'validateRecipe',
      ].sort(),
    );
  });
  it('imports nothing from prayer, rules, zod or adhan', () => {
    const src = readFileSync(new URL('../src/edge.ts', import.meta.url), 'utf8');
    const code = src
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith('//'))
      .join(' ');
    expect(code).not.toMatch(/prayer|rules|zod|adhan|settings|plural/);
  });
});
