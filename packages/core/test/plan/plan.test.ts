import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  dayPlan,
  eatingWindow,
  formatHm,
  inWindow,
  nextDays,
  parseIsoDate,
  rangeStats,
  tabularHijri,
} from '../../src/index';
import type { Settings } from '../../src/index';

const day = (iso: string) => parseIsoDate(iso)!;
const mk = (p: Partial<Settings['practices']>, rest: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  ...rest,
  practices: { ...DEFAULT_SETTINGS.practices, ...p },
});
const hm = (m: number) => formatHm(m);

describe('dayPlan, TESTING 3.5', () => {
  it('orthodox + IF16, 2026-12-02', () => {
    const p = dayPlan(day('2026-12-02'), mk({ orthodox: true, ifOn: true }));
    expect(p.level).toBe('voda');
    expect(p.window).toMatchObject({ start: 12 * 60, end: 20 * 60, kind: 'if' });
    expect(p.title).toBe('Post na vodi');
    expect(p.sub).toBe('Božićni post, 5. dan od 40');
    expect(p.headline).toBe('orthodox');
    expect(p.orthFast).toBe(true);
    expect(p.date).toEqual({ y: 2026, m: 12, d: 2, wd: 3 });
  });
  it('ramadan + IF16, 2027-02-08', () => {
    const p = dayPlan(day('2027-02-08'), mk({ ramadan: true, ifOn: true }));
    expect(hm(p.window!.start)).toBe('17:06');
    expect(p.window!.end).toBe(1440 + 60 + 6);
    expect(hm(p.window!.end)).toBe('01:06');
    expect(p.window!.ifInside).toBe(true);
    expect(p.window!.kind).toBe('ramazan');
    expect(p.title).toBe('1. ramazan');
    expect(p.sub).toBe('Post od zore do akšama, 1448. po Hidžri');
    expect(p.headline).toBe('ramadan');
    expect(p.ramadan?.length).toBe(30);
  });
  it('ramadan only, 2027-02-08: 17:06 to 05:14 next day', () => {
    const p = dayPlan(day('2027-02-08'), mk({ ramadan: true }));
    expect(hm(p.window!.start)).toBe('17:06');
    expect(p.window!.end).toBe(1440 + 5 * 60 + 14);
    expect(p.window!.ifInside).toBe(false);
  });
  it('ramadan + exception, 2027-02-08', () => {
    const n = day('2027-02-08');
    const p = dayPlan(n, mk({ ramadan: true }, { exceptions: { [n]: 'zdravlje' } }));
    expect(p.window).toBeNull();
    expect(p.title).toBe('Danas ne postiš');
    expect(p.sub).toBe('1. ramazan, dan za naknadu');
    expect(p.kaza).toBe(true);
    expect(p.ramadan?.kazaCount).toBe(1);
    expect(p.exception).toBe('zdravlje');
    expect(p.level).toBe('mrsno');
    expect(p.headline).toBe('exception');
  });
  it('nafila suggested on Mon 2026-11-23, not chosen', () => {
    const p = dayPlan(day('2026-11-23'), mk({ nafila: true }));
    expect(p.title).toBe('Danas nema posta');
    expect(p.sub).toBe('Dobrovoljni post je moguć: ponedjeljak, sunnet post');
    expect(p.nafila).toBe('Ponedjeljak, sunnet post');
    expect(p.nafilaFast).toBe(false);
    expect(p.window).toBeNull();
    expect(p.headline).toBe('none');
    expect(p.times).not.toBeNull();
  });
  it('nafila chosen: window maghrib to fajr, title Dobrovoljni post', () => {
    const n = day('2026-11-23');
    const p = dayPlan(n, mk({ nafila: true }, { nafilaDays: { [n]: true } }));
    expect(p.title).toBe('Dobrovoljni post');
    expect(p.sub).toBe('Ponedjeljak, sunnet post');
    expect(p.window!.kind).toBe('nafila');
    expect(p.window!.start).toBe(p.times!.maghrib);
    expect(p.window!.end).toBe(p.times!.fajr + 1440);
    expect(p.headline).toBe('nafila');
  });
  it('IF only 14:10', () => {
    const p = dayPlan(day('2026-12-02'), mk({ ifOn: true }, { ifPlan: 14 }));
    expect(p.window).toMatchObject({ start: 10 * 60, end: 20 * 60, kind: 'if' });
    expect(p.title).toBe('IF 14:10');
    expect(p.sub).toBe('Prozor za jelo 10:00–20:00');
    expect(p.headline).toBe('if');
    expect(p.times).toBeNull();
  });
  it('minor + IF on: no window', () => {
    const p = dayPlan(day('2026-12-02'), mk({ ifOn: true }, { minor: true }));
    expect(p.ifHours).toBe(0);
    expect(p.window).toBeNull();
  });
  it('orthodox off, ramadan on, 2026-12-02: no Orthodox reasons, 68 days to Ramadan', () => {
    const p = dayPlan(day('2026-12-02'), mk({ ramadan: true }));
    expect(p.orthodox).toBeNull();
    expect(p.level).toBe('mrsno');
    expect(p.ramadanDay).toBe(0);
    expect(p.title).toBe('Danas nema posta');
  });
});

describe('dayPlan, other priorities', () => {
  it('orthodox + ramadan: sub gets ", i N. ramazan"', () => {
    const p = dayPlan(day('2027-02-08'), mk({ orthodox: true, ramadan: true }));
    expect(p.headline).toBe('ramadan');
    const q = dayPlan(day('2027-02-09'), mk({ orthodox: true, ramadan: true }));
    expect(q.ramadanDay).toBe(2);
    const wed = dayPlan(day('2027-02-10'), mk({ orthodox: true, ramadan: true }));
    expect(wed.sub).toBe('Srijeda, i 3. ramazan');
    expect(wed.title).toBe('Post na vodi');
  });
  it('orthodox fast and Ramadan together', () => {
    const p = dayPlan(day('2027-02-17'), mk({ orthodox: true, ramadan: true }));
    expect(p.orthFast).toBe(true);
    expect(p.sub).toBe('Srijeda, i 10. ramazan');
  });
  it('priority 4: orthodox free day with a named reason', () => {
    const p = dayPlan(day('2027-01-07'), mk({ orthodox: true }));
    expect(p.headline).toBe('free');
    expect(p.title).toBe('Mrsno');
    expect(p.sub).toBe('Svjatki, od Božića do Krstovdana, mrsna sedmica');
    expect(p.orthFast).toBe(false);
  });
  it('priority 6: no rule applies', () => {
    const p = dayPlan(day('2027-03-01'), mk({ orthodox: true }));
    expect(p.headline).toBe('none');
    expect(p.sub).toBe('Nijedno tvoje pravilo ne važi za ovaj dan');
  });
  it('exception outside Ramadan', () => {
    const n = day('2026-12-02');
    const p = dayPlan(n, mk({ orthodox: true }, { exceptions: { [n]: 'putovanje' } }));
    expect(p.title).toBe('Danas ne postiš');
    expect(p.sub).toBe('Izuzetak: putovanje');
    expect(p.kaza).toBe(false);
    expect(p.level).toBe('mrsno');
    expect(p.ruleLevel).toBe('voda');
    expect(p.orthFast).toBe(false);
  });
  it('strictness cap reaches the plan level', () => {
    expect(dayPlan(day('2026-12-02'), mk({ orthodox: true }, { strictness: 'riba' })).level).toBe('riba');
  });
  it('ramadan shift moves the month', () => {
    const p = dayPlan(day('2027-02-08'), mk({ ramadan: true }, { ramadanShift: 1 }));
    expect(p.ramadanDay).toBe(0);
    expect(p.hijri).toEqual(tabularHijri(day('2027-02-08'), 1));
  });
});

describe('window helpers', () => {
  it('eatingWindow returns null with nothing active', () => {
    expect(eatingWindow({ ramadan: false, nafilaFast: false, times: null, ifHours: 0 })).toBeNull();
  });
  it('inWindow handles windows past midnight', () => {
    const w = { start: 17 * 60 + 6, end: 1440 + 5 * 60 + 14 };
    expect(inWindow(18 * 60, w)).toBe(true);
    expect(inWindow(2 * 60, w)).toBe(true);
    expect(inWindow(12 * 60, w)).toBe(false);
    expect(inWindow(5 * 60 + 14, w)).toBe(false);
    expect(inWindow(12 * 60, { start: 12 * 60, end: 20 * 60 })).toBe(true);
    expect(inWindow(20 * 60, { start: 12 * 60, end: 20 * 60 })).toBe(false);
  });
});

describe('rangeStats', () => {
  it('counts a hand-checked week', () => {
    // 2027-03-15 (Mon, Veliki post) .. 03-21 (Sun): 5 voda (Mon-Fri), 2 ulje (Sat, Sun)
    const st = rangeStats(day('2027-03-15'), 7, mk({ orthodox: true }));
    expect(st).toEqual({ days: 7, voda: 5, ulje: 2, riba: 0, bezmesa: 0, ramadan: 0, free: 0, nafila: 0 });
  });
  it('counts Ramadan, free, exception and nafila days', () => {
    const a = day('2027-02-08');
    const s = mk({ ramadan: true, nafila: true }, { exceptions: { [a]: 'zdravlje' } });
    const st = rangeStats(a - 4, 9, s);
    expect(st.days).toBe(9);
    expect(st.ramadan).toBe(4);
    expect(st.free).toBe(5);
    expect(st.nafila).toBeGreaterThan(0);
  });
  it('nextDays returns consecutive plans', () => {
    const plans = nextDays(day('2026-12-01'), 3, DEFAULT_SETTINGS);
    expect(plans.map((p) => p.n)).toEqual([day('2026-12-01'), day('2026-12-02'), day('2026-12-03')]);
    expect(nextDays(0, -2, DEFAULT_SETTINGS)).toEqual([]);
  });
  it('property: the buckets add up to days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: day('2026-01-01'), max: day('2030-12-31') }),
        fc.integer({ min: 0, max: 40 }),
        fc.record({ orthodox: fc.boolean(), ramadan: fc.boolean(), nafila: fc.boolean(), ifOn: fc.boolean() }),
        (start, days, practices) => {
          const st = rangeStats(start, days, { ...DEFAULT_SETTINGS, practices });
          expect(st.voda + st.ulje + st.riba + st.bezmesa + st.ramadan + st.free).toBe(st.days);
          expect(st.days).toBe(days);
        },
      ),
      { numRuns: 60 },
    );
  });
});
