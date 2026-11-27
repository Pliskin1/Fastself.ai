import { isoDate, nextDays, rangeStats, toDayNum, validateRecipe, type Recipe } from '@fastself/core';
import { fixtureSettings } from '@/test/utils';
import {
  buildMealPlanInput,
  keepValidRecipes,
  planIsCurrent,
  revalidateStored,
  rowModels,
  shoppingCount,
  summaryItems,
} from '../model';

const DEC_2 = toDayNum(2026, 12, 2);

const OK: Recipe = {
  id: 'ok',
  title: 'Salata od paradajza',
  timeMin: 5,
  meals: ['rucak', 'vecera'],
  cats: ['povrce'],
  ingredients: ['paradajz', 'krastavac'],
  steps: ['Isjeckaj povrće.'],
};
const MEAT: Recipe = {
  id: 'meat',
  title: 'Pileća supa',
  timeMin: 40,
  meals: ['rucak'],
  cats: ['meso'],
  ingredients: ['piletina'],
  steps: ['Skuvaj piletinu.'],
};

describe('plan model, orthodox from 2 Dec 2026', () => {
  const settings = fixtureSettings({ orthodox: true });

  it('7 days: Wed voda, Thu ulje, Fri to Sun riba (Vavedenje), Mon voda, Tue ulje', () => {
    const plans = nextDays(DEC_2, 7, settings);
    const items = summaryItems(rangeStats(DEC_2, 7, settings));
    expect(items.map((i) => [i.key, i.n])).toEqual([
      ['voda', 2],
      ['ulje', 2],
      ['riba', 3],
    ]);
    expect(items.map((i) => i.text)).toEqual(['2 dana voda', '2 dana ulje', '3 dana riba']);
    const rows = rowModels(plans, settings);
    expect(rows.map((r) => r.title)).toEqual([
      'Post na vodi',
      'Post na ulju',
      'Riba dozvoljena',
      'Riba dozvoljena',
      'Riba dozvoljena',
      'Post na vodi',
      'Post na ulju',
    ]);
    expect(rows.map((r) => r.weekday)).toEqual(['Danas', 'Čet', 'Pet', 'Sub', 'Ned', 'Pon', 'Uto']);
    expect(rows[0]!.date).toBe('2.12.');
    expect(rows[0]!.tone).toBe('level');
  });

  it('30 days: the counts sum to 30 and match rangeStats', () => {
    const stats = rangeStats(DEC_2, 30, settings);
    const items = summaryItems(stats);
    expect(items.reduce((sum, i) => sum + i.n, 0)).toBe(30);
    for (const i of items) expect(i.n).toBe(stats[i.key as 'voda']);
    expect(rowModels(nextDays(DEC_2, 30, settings), settings)).toHaveLength(30);
  });

  it('leaves zero counts out and writes "1 dan"', () => {
    const items = summaryItems({ days: 1, voda: 1, ulje: 0, riba: 0, bezmesa: 0, ramadan: 0, free: 0, nafila: 0 });
    expect(items.map((i) => i.text)).toEqual(['1 dan voda']);
  });
});

describe('info lines', () => {
  it('Ramadan 2027 days show the dawn and iftar line', () => {
    const settings = fixtureSettings({ ramadan: true });
    const start = toDayNum(2027, 2, 15);
    const plans = nextDays(start, 3, settings);
    expect(plans[0]!.ramadanDay).toBeGreaterThan(0);
    const rows = rowModels(plans, settings);
    expect(rows[0]!.line).toMatch(/^Zora \d\d:\d\d, iftar \d\d:\d\d$/);
    expect(rows[0]!.tone).toBe('ramadan');
    expect(summaryItems(rangeStats(start, 3, settings)).map((i) => i.key)).toEqual(['ramadan']);
  });

  it('an IF setting shows the eating window', () => {
    const settings = fixtureSettings({ ifOn: true, ifPlan: 16 });
    const rows = rowModels(nextDays(DEC_2, 2, settings), settings);
    expect(rows[0]!.line).toBe('Jelo 12:00–20:00');
  });

  it('shows the slava on its day', () => {
    const settings = fixtureSettings({ orthodox: true, slavaId: 'nikola' });
    const rows = rowModels(nextDays(toDayNum(2026, 12, 18), 3, settings), settings);
    expect(rows[1]!.line).toContain('Tvoja slava, Sveti Nikola');
    expect(rows[0]!.line).toBeNull();
  });
});

describe('meal plan input and validation', () => {
  it('sends only days (date, forbidden, meals) and avoid', () => {
    const settings = fixtureSettings({ orthodox: true, customAvoid: ['kikiriki'], slavaId: 'nikola' });
    const plans = nextDays(DEC_2, 7, settings);
    const input = buildMealPlanInput(plans, settings);
    expect(Object.keys(input).sort()).toEqual(['avoid', 'days']);
    expect(input.avoid).toEqual(['kikiriki']);
    expect(input.days).toHaveLength(7);
    expect(Object.keys(input.days[0]!).sort()).toEqual(['date', 'forbidden', 'meals']);
    expect(input.days[0]).toMatchObject({ date: '2026-12-02', meals: ['rucak', 'vecera'] });
    expect(input.days[0]!.forbidden).toContain('meso');
    expect(JSON.stringify(input)).not.toMatch(/orthodox|nikola|Podgorica/i);
  });

  it('asks sehur and iftar on a Ramadan day', () => {
    const settings = fixtureSettings({ ramadan: true });
    const input = buildMealPlanInput(nextDays(toDayNum(2027, 2, 15), 1, settings), settings);
    expect(input.days[0]!.meals).toEqual(['sehur', 'iftar']);
  });

  it('drops recipes that fail validateRecipe for their day', () => {
    const settings = fixtureSettings({ orthodox: true });
    const plans = nextDays(DEC_2, 1, settings);
    const days = keepValidRecipes(
      {
        days: [
          {
            date: isoDate(DEC_2),
            items: [
              { meal: 'rucak', recipe: OK },
              { meal: 'vecera', recipe: MEAT },
            ],
          },
        ],
      },
      plans,
      settings,
      validateRecipe,
    );
    expect(days[0]!.items.map((i) => i.recipe.id)).toEqual(['ok']);
  });

  it('revalidates a stored plan on read and drops days outside the range', () => {
    const settings = fixtureSettings({ orthodox: true });
    const plans = nextDays(DEC_2, 1, settings);
    const stored = [
      {
        date: isoDate(DEC_2),
        items: [
          { meal: 'rucak' as const, recipe: OK },
          { meal: 'vecera' as const, recipe: MEAT },
        ],
      },
      { date: '2026-11-01', items: [{ meal: 'rucak' as const, recipe: OK }] },
    ];
    const days = revalidateStored(stored, plans, settings, validateRecipe);
    expect(days).toHaveLength(1);
    expect(days[0]!.items.map((i) => i.recipe.id)).toEqual(['ok']);
  });

  it('drops stored meals the day no longer asks for', () => {
    const settings = fixtureSettings({ orthodox: true });
    const plans = nextDays(DEC_2, 1, settings);
    const stored = [{ date: isoDate(DEC_2), items: [{ meal: 'sehur' as const, recipe: OK }] }];
    const days = revalidateStored(stored, plans, settings, validateRecipe);
    expect(days[0]!.items).toEqual([]);
  });

  it('a plan is current while its last day is today or later', () => {
    const days = [{ date: '2026-12-08', items: [] }];
    expect(planIsCurrent(days, toDayNum(2026, 12, 8))).toBe(true);
    expect(planIsCurrent(days, toDayNum(2026, 12, 9))).toBe(false);
    expect(planIsCurrent([], DEC_2)).toBe(false);
  });

  it('shows the meal count only above 1', () => {
    expect(shoppingCount(1)).toBeNull();
    expect(shoppingCount(3)).toBe('za 3 obroka');
    expect(shoppingCount(2)).toBe('za 2 obroka');
    expect(shoppingCount(5)).toBe('za 5 obroka');
  });
});
