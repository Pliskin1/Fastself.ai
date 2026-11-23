import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ALLERGENS,
  CATEGORIES,
  DEFAULT_SETTINGS,
  DIETS,
  FORBID,
  KEYWORDS,
  MEAL_IDS,
  RECIPES,
  RecipeSchema,
  categorize,
  dayPlan,
  forbiddenFor,
  parseIsoDate,
  shoppingList,
  validateRecipe,
} from '../../src/index';
import type { Category, FoodLevel, ForbiddenMap, Recipe, Settings } from '../../src/index';

const rec = (id: string) => RECIPES.find((r) => r.id === id)!;
const level = (l: FoodLevel) => forbiddenFor({ level: l }, DEFAULT_SETTINGS);
const mkRecipe = (p: Partial<Recipe>): Recipe => ({
  id: 'x',
  title: 'Test',
  timeMin: 5,
  meals: ['rucak'],
  cats: [],
  ingredients: ['voda'],
  steps: ['Skuvaj.'],
  ...p,
});

describe('data', () => {
  it('has 24 categories, 14 allergens, 5 meals and 18 recipes', () => {
    expect(CATEGORIES).toHaveLength(24);
    expect(ALLERGENS).toHaveLength(14);
    expect(MEAL_IDS).toHaveLength(5);
    expect(RECIPES).toHaveLength(18);
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(18);
  });
  it('FORBID follows DOMAIN 8 (shellfish allowed on ulje days)', () => {
    expect(FORBID.voda).toEqual(['meso', 'mlijecno', 'jaja', 'riba', 'ulje', 'vino', 'rakovi', 'mekusci']);
    expect(FORBID.ulje).toEqual(['meso', 'mlijecno', 'jaja', 'riba']);
    expect(FORBID.riba).toEqual(['meso', 'mlijecno', 'jaja']);
    expect(FORBID.bezmesa).toEqual(['meso']);
    expect(FORBID.mrsno).toEqual([]);
    expect(DIETS.vegan.cats).toContain('med');
  });
  it('every allergen is a category with keywords', () => {
    for (const a of ALLERGENS) {
      expect(CATEGORIES).toContain(a.id);
      expect(KEYWORDS[a.id]?.length, a.id).toBeGreaterThan(0);
    }
  });
  it('every recipe parses with RecipeSchema', () => {
    for (const r of RECIPES) expect(RecipeSchema.safeParse(r).success, r.id).toBe(true);
    expect(RecipeSchema.safeParse({ ...RECIPES[0], cats: ['kamen'] }).success).toBe(false);
  });
});

describe('forbiddenFor', () => {
  it('rule, diet and allergy sources with labels', () => {
    const s: Settings = {
      ...DEFAULT_SETTINGS,
      diets: { vegetarian: false, vegan: true, halal: true },
      allergies: ['orasasto', 'meso' as never],
    };
    const f = forbiddenFor({ level: 'voda' }, s);
    expect(f.ulje).toEqual({ src: 'pravilo', label: 'post na vodi' });
    expect(f.med).toEqual({ src: 'dijeta', label: 'veganska dijeta' });
    expect(f.svinjetina?.src).toBe('dijeta');
    expect(f.orasasto).toEqual({ src: 'alergija', label: 'tvoja lista alergija' });
    expect(f.meso?.src).toBe('alergija');
  });
  it('rule wins over diet, allergy wins over both', () => {
    const f = forbiddenFor(
      { level: 'ulje' },
      { ...DEFAULT_SETTINGS, diets: { vegetarian: true, vegan: false, halal: false } },
    );
    expect(f.meso?.src).toBe('pravilo');
    expect(f.rakovi?.src).toBe('dijeta');
    expect(forbiddenFor({ level: 'mrsno' }, DEFAULT_SETTINGS)).toEqual({});
  });
});

describe('validateRecipe (TESTING 3.6)', () => {
  it('voda: Posna sarma rejected, naming step 2 (oil)', () => {
    const r = validateRecipe(rec('sarma'), level('voda'), []);
    expect(r).toHaveLength(1);
    expect(r[0]).toBe(
      'Sadrži ulje (korak 2: „Propržite luk na ulju, pa dodajte pirinač i začine”), a danas je post na vodi.',
    );
  });
  it('voda: Rižoto sa pečurkama passes ("bez ulja" ignored)', () => {
    expect(validateRecipe(rec('rizoto'), level('voda'), [])).toEqual([]);
  });
  it('voda: Humus rejected (oil, step 2)', () => {
    const r = validateRecipe(rec('humus'), level('voda'), []);
    expect(r.some((x) => x.startsWith('Sadrži ulje (korak 2:'))).toBe(true);
  });
  it('riba day (4.12.): Riblja corba passes, Piletina rejected (meso, step 1)', () => {
    const f = forbiddenFor(
      dayPlan(parseIsoDate('2026-12-04')!, {
        ...DEFAULT_SETTINGS,
        practices: { ...DEFAULT_SETTINGS.practices, orthodox: true },
      }),
      DEFAULT_SETTINGS,
    );
    expect(validateRecipe(rec('riblja'), f, [])).toEqual([]);
    const r = validateRecipe(rec('piletina'), f, []);
    expect(r).toHaveLength(1);
    expect(r[0]).toContain('Sadrži meso (korak 1:');
    expect(r[0]).toContain('riba dozvoljena');
  });
  it('shellfish: only animal category rakovi passes on ulje, rejected on voda, rejected with allergy', () => {
    const r = mkRecipe({ cats: ['rakovi', 'ulje'], ingredients: ['rakovi', 'ulje'] });
    expect(validateRecipe(r, level('ulje'), [])).toEqual([]);
    expect(validateRecipe(r, level('voda'), []).length).toBeGreaterThan(0);
    for (const l of ['voda', 'ulje', 'riba', 'mrsno'] as const) {
      for (const a of ['rakovi', 'mekusci'] as const) {
        const f = forbiddenFor({ level: l }, { ...DEFAULT_SETTINGS, allergies: [a] });
        const rr = mkRecipe({ cats: [a] });
        expect(
          validateRecipe(rr, f, []).some((x) => x.includes('alergija')),
          `${l} ${a}`,
        ).toBe(true);
      }
    }
  });
  it('allergy orasasto: Salata od kupusa i oraha rejected with the allergy reason', () => {
    const f = forbiddenFor({ level: 'mrsno' }, { ...DEFAULT_SETTINGS, allergies: ['orasasto'] });
    expect(validateRecipe(rec('salata'), f, [])).toEqual([
      'Sadrži orašaste plodove, a to je na tvojoj listi alergija.',
    ]);
  });
  it('custom word kivi rejects any recipe containing it, and only those', () => {
    const r = mkRecipe({ ingredients: ['Kivi', 'jabuka'] });
    expect(validateRecipe(r, {}, ['kivi'])).toEqual(['Sadrži „kivi”, a to je na tvojoj listi alergija.']);
    expect(validateRecipe(rec('krompir'), {}, ['kivi', ' '])).toEqual([]);
  });
  it('halal: svinj and wine or rakija rejected', () => {
    const f = forbiddenFor(
      { level: 'mrsno' },
      { ...DEFAULT_SETTINGS, diets: { vegetarian: false, vegan: false, halal: true } },
    );
    expect(validateRecipe(mkRecipe({ ingredients: ['svinjsko meso'] }), f, [])).toHaveLength(1);
    expect(validateRecipe(mkRecipe({ steps: ['Dodaj čašu vina.'] }), f, [])).toHaveLength(1);
    expect(validateRecipe(mkRecipe({ steps: ['Prelij rakijom.'] }), f, [])).toHaveLength(1);
    expect(validateRecipe(rec('krompir'), f, [])).toEqual([]);
  });
  it('vegan: med is rejected', () => {
    const f = forbiddenFor(
      { level: 'mrsno' },
      { ...DEFAULT_SETTINGS, diets: { vegetarian: false, vegan: true, halal: false } },
    );
    const r = validateRecipe(rec('vocna'), f, []);
    expect(r).toEqual(['Sadrži med, što ne ide uz izabranu dijetu.']);
  });
  it('a plain category list gives neutral reasons', () => {
    const r = validateRecipe(rec('prebranac'), ['ulje'], []);
    expect(r).toEqual(['Sadrži ulje (korak 2: „Proprži luk na ulju sa alevom paprikom”).']);
    expect(validateRecipe(rec('krompir'), ['meso', 'ulje'], [])).toEqual([]);
  });
  it('cats on the recipe alone are enough', () => {
    expect(validateRecipe(mkRecipe({ cats: ['meso'] }), ['meso'], [])).toEqual(['Sadrži meso.']);
  });
  it('all 18 built-in recipes pass on a mrsno day', () => {
    for (const r of RECIPES) expect(validateRecipe(r, level('mrsno'), []), r.id).toEqual([]);
  });
});

describe('keyword guards (false positives and the added keywords)', () => {
  const cats = (text: string) => categorize(text);
  it('rak does not match rakija or prakticno, but matches rak and rakovi', () => {
    expect(cats('rakija')).not.toContain('rakovi');
    expect(cats('rakija')).toContain('alkohol');
    expect(cats('prakticno')).not.toContain('rakovi');
    expect(cats('kuvani rak, rakovi i kozice')).toContain('rakovi');
  });
  it('med does not match medaljoni, Mediteran or remedijum, but matches med', () => {
    expect(cats('medaljoni od povrća')).not.toContain('med');
    expect(cats('Mediteranska salata')).not.toContain('med');
    expect(cats('prelij medom.')).toContain('med');
    expect(cats('kašika meda')).toContain('med');
  });
  it('sir does not match sirće or sirov, but matches sir with punctuation', () => {
    expect(cats('prelij sirćetom')).not.toContain('mlijecno');
    expect(cats('sirovo povrće')).not.toContain('mlijecno');
    expect(cats('paradajz, sir, so')).toContain('mlijecno');
    expect(cats('Dodaj sir.')).toContain('mlijecno');
  });
  it('soja: sojino mlijeko is soy, sojenica is not', () => {
    expect(cats('sojino mlijeko')).toContain('soja');
    expect(cats('soja sos')).toContain('soja');
    expect(cats('sojenica')).not.toContain('soja');
  });
  it('rib: grating verbs and currants are not fish, riba is', () => {
    expect(cats('naribaj kupus')).not.toContain('riba');
    expect(cats('izribaj šargarepu')).not.toContain('riba');
    expect(cats('ribizle')).not.toContain('riba');
    expect(cats('riblja čorba, ribe')).toContain('riba');
  });
  it('vino does not match vinograd, but matches vino and vinom', () => {
    expect(cats('vinograd')).not.toContain('vino');
    expect(cats('vinograd')).not.toContain('alkohol');
    expect(cats('kuvano vino')).toEqual(expect.arrayContaining(['vino', 'alkohol']));
    expect(cats('dinstaj vinom.')).toContain('vino');
  });
  it('ulja: "bez ulja" is ignored, plain ulja is not', () => {
    expect(cats('dinstaj bez ulja')).not.toContain('ulje');
    expect(cats('malo ulja')).toContain('ulje');
    expect(cats('Bez  ulja!')).not.toContain('ulje');
  });
  it('the other added allergens are found', () => {
    expect(cats('kikiriki')).toContain('kikiriki');
    expect(cats('tofu')).toContain('soja');
    expect(cats('senf')).toContain('senf');
    expect(cats('lupina brašno')).toContain('lupina');
    expect(cats('sulfiti')).toContain('sulfiti');
    expect(cats('školjke i lignje')).toContain('mekusci');
    expect(cats('Dagnje.')).toContain('mekusci');
  });
  it('categorize accepts a list and returns categories in canonical order', () => {
    expect(categorize(['piletina', 'maslinovo ulje'])).toEqual(['ulje', 'meso']);
    expect(categorize('')).toEqual([]);
  });
});

describe('recipes self-check', () => {
  it.each(RECIPES.map((r) => [r.id, r] as const))('%s: cats match its own text', (_id, r) => {
    const found = categorize([r.title, ...r.ingredients, ...r.steps]);
    // nothing forbidden hides in the text without being declared
    for (const c of found) expect(r.cats, `text has ${c}`).toContain(c);
    // every declared category that has keywords is visible in the text
    for (const c of r.cats) if (KEYWORDS[c]) expect(found, `declared ${c}`).toContain(c);
  });
});

describe('property: validateRecipe vs FORBID', () => {
  const SAMPLE: Partial<Record<Category, string>> = {
    meso: 'piletina',
    mlijecno: 'jogurt',
    jaja: 'jaja',
    riba: 'oslić',
    ulje: 'maslinovo ulje',
    vino: 'vino',
    rakovi: 'rakovi',
    mekusci: 'dagnje',
  };
  const POOL = [
    'krompir',
    'luk',
    'piletina',
    'sir',
    'jaja',
    'oslić',
    'ulje',
    'vino',
    'kozice',
    'dagnje',
    'med',
    'pasulj',
  ];
  const levels: FoodLevel[] = ['voda', 'ulje', 'riba', 'bezmesa', 'mrsno'];

  it('if it passes, no FORBID category is in cats or in the text', () => {
    fc.assert(
      fc.property(
        fc.subarray([...CATEGORIES] as Category[]),
        fc.array(fc.constantFrom(...POOL), { minLength: 1, maxLength: 5 }),
        fc.array(fc.constantFrom(...POOL, 'Skuvaj.', 'Peci na ulju.'), { minLength: 1, maxLength: 4 }),
        fc.constantFrom(...levels),
        (cs, ing, steps, lv) => {
          const r = mkRecipe({ cats: cs, ingredients: ing, steps });
          if (validateRecipe(r, level(lv), []).length === 0) {
            const hidden = categorize([...ing, ...steps]);
            for (const c of FORBID[lv]) {
              expect(cs).not.toContain(c);
              expect(hidden).not.toContain(c);
            }
          }
        },
      ),
    );
  });
  it('a recipe containing a forbidden keyword is always rejected', () => {
    const forbiddenCats = Object.keys(SAMPLE) as Category[];
    fc.assert(
      fc.property(
        fc.constantFrom(...forbiddenCats),
        fc.nat(3),
        fc.constantFrom(...POOL.slice(0, 1)),
        (cat, pos, filler) => {
          const word = SAMPLE[cat]!;
          const steps = ['Skuvaj.', 'Dodaj ' + filler + '.', 'Posluži.', 'Gotovo.'];
          steps[pos] = `Dodaj ${word}.`;
          const f: ForbiddenMap = { [cat]: { src: 'pravilo', label: 'test' } };
          expect(validateRecipe(mkRecipe({ steps }), f, []).length).toBeGreaterThan(0);
          expect(validateRecipe(mkRecipe({ ingredients: [word] }), [cat], []).length).toBeGreaterThan(0);
        },
      ),
    );
  });
});

describe('shoppingList', () => {
  it('aggregates, counts meals and sorts sr-Latn', () => {
    const list = shoppingList([
      { n: 1, meals: [{ meal: 'rucak', recipe: { id: 'a', title: 'A', ingredients: ['Šargarepa', 'luk', 'Luk'] } }] },
      {
        n: 2,
        meals: [
          { meal: 'vecera', recipe: { id: 'b', title: 'B', ingredients: ['luk', 'celer'] } },
          { meal: 'rucak', recipe: { id: 'a', title: 'A', ingredients: ['Šargarepa'] } },
        ],
      },
    ]);
    expect(list.map((i) => i.name)).toEqual(['celer', 'luk', 'šargarepa']);
    expect(list.find((i) => i.name === 'luk')).toEqual({ name: 'luk', count: 2, recipes: ['a', 'b'] });
    expect(list.find((i) => i.name === 'šargarepa')).toEqual({ name: 'šargarepa', count: 2, recipes: ['a'] });
    expect(shoppingList([])).toEqual([]);
  });
});
