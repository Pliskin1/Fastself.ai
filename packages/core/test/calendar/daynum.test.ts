import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { daysInMonth, fromDayNum, isoDate, monthGrid, parseIsoDate, toDayNum } from '../../src/index';

describe('daynum', () => {
  it('epoch is day 0 and a Thursday', () => {
    expect(toDayNum(1970, 1, 1)).toBe(0);
    expect(fromDayNum(0)).toEqual({ y: 1970, m: 1, d: 1, wd: 4 });
  });
  it('2026-12-02 is a Wednesday', () => {
    expect(fromDayNum(toDayNum(2026, 12, 2)).wd).toBe(3);
  });
  it('isoDate and parseIsoDate round-trip', () => {
    const n = toDayNum(2027, 3, 28);
    expect(isoDate(n)).toBe('2027-03-28');
    expect(parseIsoDate('2027-03-28')).toBe(n);
    expect(parseIsoDate('2027-3-28')).toBeNull();
    expect(parseIsoDate('nope')).toBeNull();
    expect(parseIsoDate('2027-02-30')).toBeNull();
  });
  it('daysInMonth handles leap years', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2026, 12)).toBe(31);
    expect(daysInMonth(2026, 11)).toBe(30);
  });
  it('monthGrid starts on Monday and is padded to whole weeks', () => {
    const g = monthGrid(2026, 12); // 1 Dec 2026 is a Tuesday
    expect(g.length % 7).toBe(0);
    expect(g[0]).toBeNull();
    expect(g[1]).toBe(toDayNum(2026, 12, 1));
    expect(g.filter((x) => x !== null)).toHaveLength(31);
    expect(monthGrid(2026, 6)[0]).toBe(toDayNum(2026, 6, 1)); // 1 Jun 2026 is a Monday
  });
  it('property: fromDayNum(toDayNum(x)) === x for 1901-2099', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1901, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        (y, m, d) => {
          const r = fromDayNum(toDayNum(y, m, d));
          expect([r.y, r.m, r.d]).toEqual([y, m, d]);
        },
      ),
    );
  });
  it('is independent of the host time zone', () => {
    expect(toDayNum(2027, 1, 1)).toBe(Math.floor(Date.UTC(2027, 0, 1) / 864e5));
  });
});
