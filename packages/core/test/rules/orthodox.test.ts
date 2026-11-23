import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  LEVEL_RANK,
  LEVEL_SHORT,
  LEVEL_TITLE,
  RULE_PACK_VERSION,
  RulePackSchema,
  capLevel,
  fromDayNum,
  getRulePack,
  isoDate,
  orthodoxEaster,
  orthodoxRule,
  parseIsoDate,
  stricter,
  toDayNum,
} from '../../src/index';
import type { FoodLevel, Strictness } from '../../src/index';
import pack from '../../rule-packs/orthodox.v0.1.json';
import { ORTHODOX_DAY_ROWS, ORTHODOX_PERIOD_ROWS } from '../golden/orthodox-days';
import { ORTHODOX_YEARS } from '../golden/orthodox-years';

const day = (iso: string) => parseIsoDate(iso)!;
const LEVELS: FoodLevel[] = ['voda', 'ulje', 'riba', 'bezmesa', 'mrsno'];

describe('levels', () => {
  it('ranks and helpers', () => {
    expect(LEVEL_RANK).toEqual({ voda: 4, ulje: 3, riba: 2, bezmesa: 1, mrsno: 0 });
    expect(stricter('riba', 'ulje')).toBe('ulje');
    expect(stricter('voda', 'mrsno')).toBe('voda');
    expect(capLevel('voda', 'riba')).toBe('riba');
    expect(capLevel('bezmesa', 'riba')).toBe('bezmesa');
    expect(LEVEL_TITLE.voda).toBe('Post na vodi');
    expect(LEVEL_TITLE.riba).toBe('Riba dozvoljena');
    expect(LEVEL_SHORT.bezmesa).toBe('bez mesa');
  });
});

describe('rule pack', () => {
  it('parses with RulePackSchema', () => {
    expect(RulePackSchema.safeParse(pack).success).toBe(true);
    expect(getRulePack()).toBe(getRulePack());
    expect(RULE_PACK_VERSION).toBe('0.1');
  });
  it('rejects unknown fields and bad levels', () => {
    expect(RulePackSchema.safeParse({ ...pack, extra: 1 }).success).toBe(false);
    expect(
      RulePackSchema.safeParse({ ...pack, relax: [{ id: 'x', name: 'x', fixed: '01-01', to: 'meso', src: 'domain' }] })
        .success,
    ).toBe(false);
  });
});

describe('orthodoxRule golden (TESTING 3.2)', () => {
  it.each(ORTHODOX_DAY_ROWS)('%s -> %s %j', (iso, level, labels) => {
    const r = orthodoxRule(day(iso));
    expect(r.level).toBe(level);
    expect(r.reasons.map((x) => x.label)).toEqual(labels);
  });
  it.each(ORTHODOX_PERIOD_ROWS)('%s is in %s, day %i of %i', (iso, id, index, length) => {
    expect(orthodoxRule(day(iso)).period).toMatchObject({ id, index, length });
  });
  it('free days have no period', () => {
    expect(orthodoxRule(day('2027-01-07')).period).toBeNull();
    expect(orthodoxRule(day('2027-03-01')).period).toBeNull();
  });
  it('reason levels match the rule that produced them', () => {
    const r = orthodoxRule(day('2027-05-12'));
    expect(r.reasons[0]).toMatchObject({ label: 'Srijeda', level: 'ulje' });
    expect(orthodoxRule(day('2027-04-07')).reasons[2]).toMatchObject({ label: 'Blagovijesti', level: 'riba' });
  });
});

describe('strictness cap', () => {
  it('ulje on 2026-12-02 gives ulje plus the cap reason', () => {
    const r = orthodoxRule(day('2026-12-02'), { strictness: 'ulje' });
    expect(r.level).toBe('ulje');
    expect(r.reasons.at(-1)).toMatchObject({ label: 'Tvoja mjera posta', sub: 'najstrože što držiš: ulje' });
  });
  it('riba on 2027-03-15 gives riba', () => {
    expect(orthodoxRule(day('2027-03-15'), { strictness: 'riba' }).level).toBe('riba');
  });
  it('riba on 2027-03-10 stays bezmesa without a cap reason', () => {
    const r = orthodoxRule(day('2027-03-10'), { strictness: 'riba' });
    expect(r.level).toBe('bezmesa');
    expect(r.reasons.map((x) => x.label)).toEqual(['Bijela sedmica']);
  });
  it('voda adds no cap reason', () => {
    expect(orthodoxRule(day('2026-12-02'), { strictness: 'voda' }).reasons.map((x) => x.label)).not.toContain(
      'Tvoja mjera posta',
    );
  });
  it('property: the cap never raises a level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: toDayNum(2026, 1, 1), max: toDayNum(2036, 12, 31) }),
        fc.constantFrom<Strictness>('voda', 'ulje', 'riba'),
        (n, strictness) => {
          const base = orthodoxRule(n, { strictness: 'voda' }).level;
          const capped = orthodoxRule(n, { strictness }).level;
          expect(LEVEL_RANK[capped]).toBeLessThanOrEqual(LEVEL_RANK[base]);
          if (LEVEL_RANK[base] > LEVEL_RANK[strictness]) expect(capped).toBe(strictness);
        },
      ),
    );
  });
  it('every level is reachable and valid', () => {
    const seen = new Set<FoodLevel>();
    for (let n = toDayNum(2026, 1, 1); n < toDayNum(2027, 1, 1); n++) seen.add(orthodoxRule(n).level);
    expect([...seen].sort()).toEqual([...LEVELS].sort());
  });
});

describe('movable boundaries 2026-2036', () => {
  const periodId = (iso: string) => orthodoxRule(day(iso)).period?.id ?? null;
  const reasonLabels = (iso: string) => orthodoxRule(day(iso)).reasons.map((r) => r.label);
  const shift = (iso: string, k: number) => isoDate(day(iso) + k);

  describe.each(ORTHODOX_YEARS)('$year', (Y) => {
    it('Easter matches', () => {
      expect(isoDate(orthodoxEaster(Y.year))).toBe(Y.easter);
    });
    it('Veliki post spans first to last day', () => {
      const [a, b] = Y.veliki;
      expect(orthodoxRule(day(a)).period).toMatchObject({ id: 'veliki', index: 1, length: 48 });
      expect(orthodoxRule(day(b)).period).toMatchObject({ id: 'veliki', index: 48, length: 48 });
      expect(periodId(shift(a, -1))).not.toBe('veliki');
      expect(periodId(shift(b, 1))).not.toBe('veliki');
    });
    it('Petrovski spans first to last day with the stated length', () => {
      const [a, b] = Y.petrovski;
      expect(orthodoxRule(day(a)).period).toMatchObject({ id: 'petrovski', index: 1, length: Y.petrovskiDays });
      expect(orthodoxRule(day(b)).period).toMatchObject({
        id: 'petrovski',
        index: Y.petrovskiDays,
        length: Y.petrovskiDays,
      });
      expect(day(b) - day(a) + 1).toBe(Y.petrovskiDays);
      expect(periodId(shift(a, -1))).not.toBe('petrovski');
      expect(periodId(shift(b, 1))).not.toBe('petrovski');
    });
    it('free weeks are mrsno or bezmesa and bounded', () => {
      for (const [r, level] of [
        [Y.mitar, 'mrsno'],
        [Y.svijetla, 'mrsno'],
        [Y.trojicina, 'mrsno'],
        [Y.bijela, 'bezmesa'],
      ] as const) {
        expect(orthodoxRule(day(r[0])).level).toBe(level);
        expect(orthodoxRule(day(r[1])).level).toBe(level);
        expect(orthodoxRule(day(r[0])).reasons).toHaveLength(1);
      }
      expect(orthodoxRule(day(shift(Y.bijela[0], -1))).level).not.toBe('bezmesa');
      expect(orthodoxRule(day(shift(Y.bijela[1], 1))).period?.id).toBe('veliki');
      expect(orthodoxRule(day(shift(Y.svijetla[1], 1))).reasons.map((r) => r.label)).not.toContain('Svijetla sedmica');
      expect(orthodoxRule(day(shift(Y.trojicina[0], -1))).reasons.map((r) => r.label)).not.toContain(
        'Trojičina sedmica',
      );
      expect(orthodoxRule(day(shift(Y.trojicina[1], 1))).period?.id).toBe('petrovski');
    });
    it('Cvijeti is riba, Prepolovljenje and Odanije are riba', () => {
      expect(orthodoxRule(day(Y.cvijeti)).level).toBe('riba');
      expect(reasonLabels(Y.cvijeti)).toContain('Cvijeti');
      expect(orthodoxRule(day(Y.prepolovljenje)).level).toBe('riba');
      expect(reasonLabels(Y.prepolovljenje)).toContain('Prepolovljenje');
      expect(orthodoxRule(day(Y.odanije)).level).toBe('riba');
      expect(reasonLabels(Y.odanije)).toContain('Odanije Vaskrsa');
    });
    it('Wed/Fri from Tomina to Duhovi are ulje unless relaxed to riba', () => {
      for (let n = day(Y.tomina); n < day(Y.duhovi); n++) {
        const wd = fromDayNum(n).wd;
        if (wd !== 3 && wd !== 5) continue;
        const iso = isoDate(n);
        const expected = iso === Y.prepolovljenje || iso === Y.odanije ? 'riba' : 'ulje';
        expect(orthodoxRule(n).level, iso).toBe(expected);
      }
    });
    it('Petrovdan and Velika Gospojina are riba on Wed/Fri, otherwise mrsno', () => {
      for (const [md, wd] of [
        ['07-12', Y.petrovdanWd],
        ['08-28', Y.gospojinaWd],
      ] as const) {
        const r = orthodoxRule(day(`${Y.year}-${md}`));
        expect(r.level).toBe(wd === 'Wed' || wd === 'Fri' ? 'riba' : 'mrsno');
      }
    });
    it('fast-day weekdays inside the period obey the week map', () => {
      const [a] = Y.veliki;
      const mon = orthodoxRule(day(a));
      expect(mon.level).toBe('voda');
    });
  });
});

describe('year-end wrap and one-day fasts', () => {
  it('Bozicni post 28.11 to 6.1 has 40 days', () => {
    expect(orthodoxRule(day('2026-11-28')).period).toMatchObject({ id: 'bozicni', index: 1, length: 40 });
    expect(orthodoxRule(day('2027-01-05')).period).toMatchObject({ id: 'bozicni', index: 39, length: 40 });
    expect(orthodoxRule(day('2026-11-27')).period).toBeNull();
    expect(orthodoxRule(day('2027-01-07')).period).toBeNull();
  });
  it('Badnji dan has only its own reason', () => {
    expect(orthodoxRule(day('2028-01-06')).reasons.map((r) => r.label)).toEqual(['Badnji dan']);
  });
  it('the host time zone does not matter', () => {
    expect(new Date(2027, 0, 1).getTimezoneOffset()).toBe(-840);
    expect(orthodoxRule(day('2027-01-19')).level).toBe('mrsno');
  });
});
