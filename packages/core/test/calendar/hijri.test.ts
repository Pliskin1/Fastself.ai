import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ISLAMIC_PACK_VERSION, hijriDate, parseIsoDate, tabularHijri, toDayNum } from '../../src/index';
import { IslamicPackSchema, getIslamicPack } from '../../src/calendar/hijriPack';
import { monthTable, tabularMonthLength, tabularMonthStart } from '../../src/calendar/hijriDate';
import pack from '../../rule-packs/islamic.v0.1.json';
import { HIJRI_DIYANET_GOLDEN } from '../golden/hijri-diyanet';
import { HIJRI_GOLDEN, HIJRI_TABULAR_GOLDEN } from '../golden/hijri';

const day = (iso: string) => parseIsoDate(iso)!;

describe('tabularHijri (unchanged)', () => {
  it.each(HIJRI_TABULAR_GOLDEN)('%s -> %i/%i/%i', (iso, y, m, d) => {
    expect(tabularHijri(day(iso))).toEqual({ y, m, d });
  });
  it('shift +1 shows the previous day', () => {
    expect(tabularHijri(day('2027-02-09'), 1)).toEqual({ y: 1448, m: 9, d: 1 });
  });
});

describe('hijriDate golden (TESTING 3.4)', () => {
  it.each(HIJRI_GOLDEN)('%s -> %i/%i/%i (shift %i)', (iso, y, m, d, shift) => {
    expect(hijriDate(day(iso), shift)).toEqual({ y, m, d });
  });
  it('default shift is 0', () => {
    expect(hijriDate(day('2027-02-08'))).toEqual(hijriDate(day('2027-02-08'), 0));
  });
});

describe('hijriDate vs the Diyanet rows', () => {
  it.each(HIJRI_DIYANET_GOLDEN)('%s -> %i/%i/%i', (iso, y, m, d) => {
    expect(hijriDate(day(iso), 0)).toEqual({ y, m, d });
  });
});

describe('shift', () => {
  it('hijriDate(n, 1) equals hijriDate(n - 1, 0), before, inside and after the data', () => {
    for (const iso of [
      '2026-01-10',
      '2026-11-10',
      '2026-12-02',
      '2027-02-08',
      '2027-06-06',
      '2027-11-29',
      '2028-03-01',
    ]) {
      expect(hijriDate(day(iso), 1)).toEqual(hijriDate(day(iso) - 1, 0));
      expect(hijriDate(day(iso), -1)).toEqual(hijriDate(day(iso) + 1, 0));
    }
  });
});

describe('continuity 2020-2035', () => {
  const SWITCH = day('2026-11-10'); // tabular -> first Diyanet anchor
  it('days advance by one, or roll over from day 29 or 30 to day 1', () => {
    const odd: string[] = [];
    for (let n = toDayNum(2020, 1, 2); n <= toDayNum(2035, 12, 31); n++) {
      const a = hijriDate(n - 1);
      const b = hijriDate(n);
      const same = b.y === a.y && b.m === a.m && b.d === a.d + 1;
      const nextM = a.m === 12 ? { y: a.y + 1, m: 1 } : { y: a.y, m: a.m + 1 };
      const roll = (a.d === 29 || a.d === 30) && b.d === 1 && b.y === nextM.y && b.m === nextM.m;
      expect(b.d).toBeLessThanOrEqual(30);
      if (!same && !roll) odd.push(`${n}`);
    }
    expect(odd).toEqual([String(SWITCH)]);
  });
  it('the one jump is the switch into the first anchor on 2026-11-10', () => {
    expect(hijriDate(SWITCH - 1)).toMatchObject({ y: 1448, m: 5 });
    expect(hijriDate(SWITCH)).toEqual({ y: 1448, m: 6, d: 1 });
  });
  it('property: no repeated date and never day 31', () => {
    fc.assert(
      fc.property(fc.integer({ min: toDayNum(2020, 1, 1), max: toDayNum(2035, 12, 30) }), (n) => {
        const a = hijriDate(n);
        const b = hijriDate(n + 1);
        expect(`${a.y}-${a.m}-${a.d}`).not.toBe(`${b.y}-${b.m}-${b.d}`);
        expect(a.d).toBeLessThanOrEqual(30);
        expect(a.d).toBeGreaterThanOrEqual(1);
      }),
    );
  });
});

describe('Islamic pack', () => {
  it('parses with the strict schema and has a version', () => {
    expect(IslamicPackSchema.safeParse(pack).success).toBe(true);
    expect(getIslamicPack()).toBe(getIslamicPack());
    expect(ISLAMIC_PACK_VERSION).toBe('0.1');
    expect(IslamicPackSchema.safeParse({ ...pack, extra: 1 }).success).toBe(false);
    expect(
      IslamicPackSchema.safeParse({ ...pack, monthStarts: [{ ...pack.monthStarts[0], hijri: '1448-13' }] }).success,
    ).toBe(false);
  });
  it('builds the month table without throwing: every month is 29 or 30 days and months are contiguous', () => {
    const rows = monthTable();
    expect(rows.length).toBeGreaterThan(10);
    for (const r of rows) expect([29, 30]).toContain(r.length);
    for (let i = 0; i + 1 < rows.length; i++) expect(rows[i]!.start + rows[i]!.length).toBe(rows[i + 1]!.start);
    expect(rows[0]).toMatchObject({ y: 1448, m: 6 });
    // Ramadan 1448 lasts 29 days (Diyanet)
    expect(rows.find((r) => r.y === 1448 && r.m === 9)!.length).toBe(29);
  });
  it('tabular month helpers agree with tabularHijri', () => {
    expect(tabularMonthStart(1448, 9)).toBe(day('2027-02-08'));
    expect(tabularMonthLength(1448, 9)).toBe(30);
    expect(tabularMonthLength(1448, 12)).toBe(29);
    expect(tabularMonthLength(1447, 12)).toBeGreaterThanOrEqual(29);
  });
});
