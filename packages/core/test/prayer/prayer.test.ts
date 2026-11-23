import { describe, expect, it } from 'vitest';
import { CITIES, closestCity, formatHm, parseIsoDate, prayerTimes } from '../../src/index';
import type { CityId, PrayerMethod } from '../../src/index';
import { PRAYER_GOLDEN } from '../golden/prayer';
import { PRAYER_DIYANET_GOLDEN } from '../golden/prayer-diyanet';
import { PRAYER_IZCG_GOLDEN } from '../golden/prayer-izcg';

const day = (iso: string) => parseIsoDate(iso)!;
const mins = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

describe('prayerTimes MWL Podgorica (TESTING 3.3, +-1 min)', () => {
  it.each(PRAYER_GOLDEN)('%s', (iso, ...hm) => {
    const t = prayerTimes(day(iso), 'podgorica', 'mwl');
    KEYS.forEach((k, i) => {
      const want = mins(hm[i]!);
      expect(Math.abs(t[k] - want), `${iso} ${k}: got ${formatHm(t[k])}, want ${hm[i]}`).toBeLessThanOrEqual(1);
    });
  });
  it('returns integer minutes in order', () => {
    const t = prayerTimes(day('2026-12-02'), 'podgorica', 'mwl');
    for (const k of KEYS) expect(Number.isInteger(t[k])).toBe(true);
    expect(t.fajr).toBeLessThan(t.sunrise);
    expect(t.sunrise).toBeLessThan(t.dhuhr);
    expect(t.dhuhr).toBeLessThan(t.asr);
    expect(t.asr).toBeLessThan(t.maghrib);
    expect(t.maghrib).toBeLessThan(t.isha);
  });
});

const goldenSuite = (
  title: string,
  method: PrayerMethod,
  rows: readonly (readonly [string, string, string, string, string, string, string])[],
) =>
  describe(title, () => {
    it.each(rows)('%s', (iso, ...hm) => {
      const t = prayerTimes(day(iso), 'podgorica', method);
      KEYS.forEach((k, i) => {
        const want = mins(hm[i]!);
        expect(Math.abs(t[k] - want), `${iso} ${k}: got ${formatHm(t[k])}, want ${hm[i]}`).toBeLessThanOrEqual(1);
      });
    });
  });

goldenSuite('prayerTimes izcg Podgorica = official IZ CG vaktija, November 2026 (+-1 min)', 'izcg', PRAYER_IZCG_GOLDEN);
goldenSuite('prayerTimes turkey Podgorica = Diyanet Ramadan 1448 timetable (+-1 min)', 'turkey', PRAYER_DIYANET_GOLDEN);

describe('methods and offsets', () => {
  const n = day('2026-12-02');
  it('izcg is not plain mwl: iftar carries the IZ CG safety minutes', () => {
    const izcg = prayerTimes(n, 'podgorica', 'izcg');
    const mwl = prayerTimes(n, 'podgorica', 'mwl');
    expect(izcg.maghrib - mwl.maghrib).toBeGreaterThanOrEqual(7);
    expect(mwl.sunrise - izcg.sunrise).toBeGreaterThanOrEqual(7);
    expect(izcg.fajr).toBeLessThan(mwl.fajr); // 19.5 deg zora is earlier than 18 deg
  });
  it('user offsets are added last, only to fajr and maghrib', () => {
    const base = prayerTimes(n, 'podgorica', 'izcg');
    const t = prayerTimes(n, 'podgorica', 'izcg', { fajr: -3, maghrib: 2 });
    expect(t.fajr).toBe(base.fajr - 3);
    expect(t.maghrib).toBe(base.maghrib + 2);
    expect(t.isha).toBe(base.isha);
    expect(t.sunrise).toBe(base.sunrise);
  });
  it('turkey and ummalqura give plausible, distinct times', () => {
    const mwl = prayerTimes(n, 'podgorica', 'mwl');
    const tr = prayerTimes(n, 'podgorica', 'turkey');
    const uq = prayerTimes(n, 'podgorica', 'ummalqura');
    expect(tr.sunrise).toBeLessThan(mwl.sunrise); // Diyanet sunrise -7
    expect(tr.maghrib).toBeGreaterThan(mwl.maghrib);
    expect(uq.isha - uq.maghrib).toBe(90);
    expect(uq.fajr).toBeGreaterThanOrEqual(mwl.fajr - 3);
    expect(uq.fajr).toBeLessThanOrEqual(mwl.fajr + 3);
  });
  it('works for every method and city, on a DST day', () => {
    for (const m of ['izcg', 'mwl', 'turkey', 'ummalqura'] as PrayerMethod[]) {
      for (const c of Object.keys(CITIES) as CityId[]) {
        const t = prayerTimes(day('2027-03-28'), c, m);
        expect(t.fajr).toBeGreaterThan(0);
        expect(t.isha).toBeLessThan(1440);
      }
    }
  });
});

describe('cities', () => {
  it('has the 11 frozen ids with plausible coordinates', () => {
    expect(Object.keys(CITIES).sort()).toEqual(
      [
        'bar',
        'berane',
        'bijelo-polje',
        'cetinje',
        'herceg-novi',
        'niksic',
        'pljevlja',
        'plav',
        'podgorica',
        'rozaje',
        'ulcinj',
      ].sort(),
    );
    expect(CITIES.podgorica).toEqual({ name: 'Podgorica', lat: 42.4304, lng: 19.2594 });
    for (const c of Object.values(CITIES)) {
      expect(c.lat).toBeGreaterThan(41.5);
      expect(c.lat).toBeLessThan(43.6);
      expect(c.lng).toBeGreaterThan(18);
      expect(c.lng).toBeLessThan(20.5);
    }
  });
  it('closestCity picks the nearest one', () => {
    expect(closestCity(42.43, 19.26)).toBe('podgorica');
    expect(closestCity(42.1, 19.1)).toBe('bar');
    expect(closestCity(43.35, 19.35)).toBe('pljevlja');
    expect(closestCity(42.3, 18.3)).toBe('herceg-novi');
  });
});
