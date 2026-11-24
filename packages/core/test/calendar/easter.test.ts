import { describe, expect, it } from 'vitest';
import { fromDayNum, isoDate, julianDate, orthodoxEaster, parseIsoDate } from '../../src/index';
import { EASTER_GOLDEN } from '../golden/easter';
import { ORTHODOX_YEARS } from '../golden/orthodox-years';

describe('orthodoxEaster', () => {
  it.each(EASTER_GOLDEN)('%i -> %s', (y, iso) => {
    expect(isoDate(orthodoxEaster(y))).toBe(iso);
  });
  it('is always a Sunday', () => {
    for (let y = 1990; y <= 2099; y++) expect(fromDayNum(orthodoxEaster(y)).wd).toBe(0);
  });
  it.each(ORTHODOX_YEARS.map((r) => [r.year, r.easter] as const))('rule-pack year %i -> %s', (y, iso) => {
    expect(isoDate(orthodoxEaster(y))).toBe(iso);
  });
});

describe('julianDate', () => {
  it('is Gregorian minus 13 days', () => {
    expect(julianDate(parseIsoDate('2026-12-02')!)).toMatchObject({ y: 2026, m: 11, d: 19 });
    expect(julianDate(parseIsoDate('2027-01-07')!)).toMatchObject({ y: 2026, m: 12, d: 25 });
  });
});
