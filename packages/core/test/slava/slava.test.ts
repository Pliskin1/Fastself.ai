import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SLAVE, isoDate, nextSlava, parseIsoDate } from '../../src/index';

const day = (iso: string) => parseIsoDate(iso)!;

describe('nextSlava (TESTING 3.7)', () => {
  it('2027-01-07, jovan: 13 days, voda (Wednesday)', () => {
    const r = nextSlava(day('2027-01-07'), 'jovan')!;
    expect(r.daysUntil).toBe(13);
    expect(r.level).toBe('voda');
    expect(r.posna).toBe(true);
    expect(r.askPriest).toBe(true);
    expect(isoDate(r.n)).toBe('2027-01-20');
    expect(r.name).toBe('Sveti Jovan');
  });
  it('2026-12-02, nikola: 17 days, riba', () => {
    const r = nextSlava(day('2026-12-02'), 'nikola')!;
    expect(r.daysUntil).toBe(17);
    expect(r.level).toBe('riba');
    expect(r.posna).toBe(true);
    expect(r.askPriest).toBe(false);
  });
  it('today counts, and it rolls to next year after the date', () => {
    expect(nextSlava(day('2026-12-19'), 'nikola')!.daysUntil).toBe(0);
    expect(isoDate(nextSlava(day('2026-12-20'), 'nikola')!.n)).toBe('2027-12-19');
  });
  it('a free day is not posna', () => {
    const r = nextSlava(day('2027-01-01'), 'stefan')!; // 9 Jan 2027, Svjatki
    expect(r.posna).toBe(false);
    expect(r.level).toBe('mrsno');
    expect(r.askPriest).toBe(false);
  });
  it('null for no slava, honours given settings', () => {
    expect(nextSlava(day('2026-12-02'), null)).toBeNull();
    const r = nextSlava(day('2026-12-02'), 'nikola', { ...DEFAULT_SETTINGS, strictness: 'ulje' })!;
    expect(r.level).toBe('riba');
  });
  it('lists the ten slavas', () => {
    expect(SLAVE).toHaveLength(10);
  });
});
