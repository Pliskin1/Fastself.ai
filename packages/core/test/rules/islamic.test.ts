import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  nafilaSuggestion,
  parseIsoDate,
  ramadanCountdown,
  ramadanMonth,
  hijriDate,
} from '../../src/index';

const day = (iso: string) => parseIsoDate(iso)!;
const naf = (iso: string, shift = 0) => nafilaSuggestion(day(iso), hijriDate(day(iso), shift));

describe('ramadanMonth', () => {
  it('1 Ramadan 1448 starts on 2027-02-08 and ends before Bajram 2027-03-09', () => {
    const r = ramadanMonth(day('2027-02-08'), DEFAULT_SETTINGS)!;
    expect(r.year).toBe(1448);
    expect(r.day).toBe(1);
    expect(r.start).toBe(day('2027-02-08'));
    expect(r.bajram).toBe(day('2027-03-09'));
    expect(r.length).toBe(29);
    expect(r.qadr).toBe(day('2027-03-05'));
    expect(r.kazaCount).toBe(0);
    expect(r.exceptionDays).toEqual([]);
  });
  it('reports the day inside the month and null outside it', () => {
    expect(ramadanMonth(day('2027-03-08'), DEFAULT_SETTINGS)!.day).toBe(29);
    expect(ramadanMonth(day('2027-02-07'), DEFAULT_SETTINGS)).toBeNull();
    expect(ramadanMonth(day('2027-03-09'), DEFAULT_SETTINGS)).toBeNull();
  });
  it('1446 and 1447 lengths agree with the next Bajram', () => {
    for (const iso of ['2025-03-01', '2026-02-18', '2028-01-27']) {
      const r = ramadanMonth(day(iso), DEFAULT_SETTINGS)!;
      expect(r.bajram - r.start).toBe(r.length);
      expect([29, 30]).toContain(r.length);
      expect(hijriDate(r.bajram)).toMatchObject({ m: 10, d: 1 });
    }
  });
  it('applies the shift: with +1 the month starts on 2027-02-09', () => {
    const s = { ...DEFAULT_SETTINGS, ramadanShift: 1 as const };
    expect(ramadanMonth(day('2027-02-08'), s)).toBeNull();
    expect(ramadanMonth(day('2027-02-09'), s)!.start).toBe(day('2027-02-09'));
  });
  it('counts exception days of this month for kaza', () => {
    const a = day('2027-02-10');
    const b = day('2027-02-20');
    const s = {
      ...DEFAULT_SETTINGS,
      exceptions: { [b]: 'putovanje' as const, [a]: 'zdravlje' as const, [day('2027-04-01')]: 'drugo' as const },
    };
    const r = ramadanMonth(day('2027-02-15'), s)!;
    expect(r.kazaCount).toBe(2);
    expect(r.exceptionDays).toEqual([a, b]);
  });
});

describe('ramadanCountdown', () => {
  it('2026-12-02 is 68 days before 2027-02-08 (TESTING 3.5)', () => {
    expect(ramadanCountdown(day('2026-12-02'), DEFAULT_SETTINGS)).toEqual({ days: 68, start: day('2027-02-08') });
  });
  it('is 1 the day before and null during Ramadan', () => {
    expect(ramadanCountdown(day('2027-02-07'), DEFAULT_SETTINGS)).toEqual({ days: 1, start: day('2027-02-08') });
    expect(ramadanCountdown(day('2027-02-08'), DEFAULT_SETTINGS)).toBeNull();
    expect(ramadanCountdown(day('2027-03-08'), DEFAULT_SETTINGS)).toBeNull();
  });
  it('counts to the next year after Ramadan and follows the shift', () => {
    expect(ramadanCountdown(day('2027-03-09'), DEFAULT_SETTINGS)!.start).toBe(day('2028-01-27'));
    expect(ramadanCountdown(day('2026-12-02'), { ...DEFAULT_SETTINGS, ramadanShift: 1 })!.days).toBe(69);
  });
});

describe('nafilaSuggestion', () => {
  it('none in Ramadan, on 1 Sevval and on 10-13 Zul-hidzdze', () => {
    expect(naf('2027-02-15')).toBeNull();
    expect(naf('2027-03-09')).toBeNull();
    expect(naf('2027-05-17')).toBeNull(); // 10 Zul-hidzdze
    expect(naf('2027-05-19')).toBeNull(); // 13 Zul-hidzdze
  });
  it('Arefat, Asura, six days of Sevval', () => {
    expect(naf('2027-05-15')).toBe('Dan Arefata');
    expect(naf('2026-06-26')).toBe('Ašura');
    expect(naf('2026-06-25')).toBe('Ašura');
    expect(naf('2027-03-11')).toBe('Šest dana ševvala');
    expect(naf('2027-03-15')).toBe('Šest dana ševvala');
  });
  it('Diyanet 1448: Arefat 2027-05-15, none on Kurban-bajram days, Asura 2027-06-14 and 15', () => {
    expect(naf('2027-05-15')).toBe('Dan Arefata');
    for (const iso of ['2027-05-16', '2027-05-17', '2027-05-18', '2027-05-19']) expect(naf(iso), iso).toBeNull();
    expect(naf('2027-06-14')).toBe('Ašura');
    expect(naf('2027-06-15')).toBe('Ašura');
  });
  it('white days 13-15 of the month', () => {
    expect(naf('2026-11-22')).toBe('Bijeli dani, 13. džumadel-uhra');
    expect(naf('2026-11-24')).toBe('Bijeli dani, 15. džumadel-uhra');
    expect(naf('2026-11-23')).toBe('Bijeli dani, 14. džumadel-uhra');
  });
  it('Monday and Thursday otherwise', () => {
    expect(naf('2026-11-30')).toBe('Ponedjeljak, sunnet post');
    expect(naf('2026-11-19')).toBe('Četvrtak, sunnet post');
    expect(naf('2026-12-01')).toBeNull(); // Tuesday
  });
});
