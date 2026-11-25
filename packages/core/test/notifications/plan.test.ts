import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_LABEL,
  DEFAULT_REMINDERS,
  DEFAULT_SETTINGS,
  FORBID,
  LEVEL_TITLE,
  MAX_PLANNED,
  PLATE,
  dayPlan,
  epochFromLocal,
  formatHm,
  ifEndParams,
  localFromEpoch,
  parseIsoDate,
  parseReminders,
  planNotifications,
} from '../../src/index';
import type { DayNum, PlannedNotification, Reminders, Settings } from '../../src/index';

const day = (iso: string) => parseIsoDate(iso)!;
const mk = (p: Partial<Settings['practices']>, rest: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  prayerMethod: 'mwl',
  ...rest,
  practices: { ...DEFAULT_SETTINGS.practices, ...p },
});
const R = (o: Partial<Reminders> = {}): Reminders => ({ ...DEFAULT_REMINDERS, ...o });
const kinds = (l: PlannedNotification[], k: string) => l.filter((x) => x.kind === k);

describe('planNotifications, evening', () => {
  const s = mk({ orthodox: true });
  const today = day('2026-12-01');
  const noon = epochFromLocal(today, 12 * 60);

  it('7 eve items at 20:00', () => {
    const l = planNotifications(today, s, noon, R());
    const eve = kinds(l, 'eve');
    expect(eve).toHaveLength(7);
    eve.forEach((e, i) => {
      expect(e.at).toBe(epochFromLocal(today + i, 20 * 60));
      expect(e.n).toBe(today + i);
    });
    expect(eve[0]!.id).toBe(`plan:eve:${today}`);
    const next = dayPlan(today + 1, s);
    expect(next.level).toBe('voda');
    const p = eve[0]!.params;
    expect(p.title).toBe(LEVEL_TITLE[next.level].toLowerCase());
    const forb = FORBID[next.level];
    const fl = PLATE.filter((c) => forb.includes(c)).map((c) => CATEGORY_LABEL[c].toLowerCase());
    const al = PLATE.filter((c) => !forb.includes(c)).map((c) => CATEGORY_LABEL[c].toLowerCase());
    expect(p.forbidden).toBe(fl.join(', '));
    expect(p.allowed).toBe(al.join(', '));
    expect(p.forbidden).not.toBe('');
    expect(p.allowed).toContain(CATEGORY_LABEL.povrce.toLowerCase());
    expect(p.allowed).not.toContain(CATEGORY_LABEL.meso.toLowerCase());
  });

  it('drops the evening that is already past', () => {
    const l = planNotifications(today, s, epochFromLocal(today, 20 * 60), R());
    expect(l.find((x) => x.id === `plan:eve:${today}`)).toBeUndefined();
    expect(kinds(l, 'eve')).toHaveLength(6);
  });

  it('no eve when tomorrow is mrsno', () => {
    let d = day('2026-03-01');
    while (dayPlan(d + 1, s).orthFast) d++;
    const l = planNotifications(d, s, epochFromLocal(d, 0), R());
    expect(l.find((x) => x.id === `plan:eve:${d}`)).toBeUndefined();
  });

  it('DST: last Sunday of March 2027 fires at 20:00 local', () => {
    const d = day('2027-03-28');
    const l = planNotifications(d, s, epochFromLocal(d, 0), R());
    const e = l.find((x) => x.id === `plan:eve:${d}`)!;
    expect(localFromEpoch(e.at)).toEqual({ n: d, minutes: 20 * 60 });
  });
});

describe('planNotifications, ramadan', () => {
  const s = mk({ ramadan: true });
  const today = day('2027-02-07');
  const start = epochFromLocal(today, 0);

  it('sehur and iftar from 1 Ramadan', () => {
    const l = planNotifications(today, s, start, R());
    expect(l.filter((x) => x.n === today && ['sehur', 'iftar'].includes(x.kind))).toEqual([]);
    for (let d = today + 1; d <= today + 6; d++) {
      const t = dayPlan(d, s).times!;
      const se = l.find((x) => x.id === `plan:sehur:${d}`)!;
      const ifr = l.find((x) => x.id === `plan:iftar:${d}`)!;
      expect(se.at).toBe(epochFromLocal(d, t.fajr - 30));
      expect(se.params).toEqual({ fajr: formatHm(t.fajr) });
      expect(ifr.at).toBe(epochFromLocal(d, t.maghrib));
      expect(ifr.params).toEqual({ time: formatHm(t.maghrib) });
    }
  });

  it('exception day has none', () => {
    const ex = today + 2;
    const l = planNotifications(today, { ...s, exceptions: { [ex]: 'zdravlje' } }, start, R());
    expect(l.filter((x) => x.n === ex)).toEqual([]);
    expect(kinds(l, 'sehur').length).toBeGreaterThan(0);
  });

  it('ramadan + IF: no windowOpen when iftar is on, present when off', () => {
    const si = mk({ ramadan: true, ifOn: true });
    const d = today + 2;
    const on = planNotifications(today, si, start, R());
    expect(on.find((x) => x.id === `plan:iftar:${d}`)).toBeDefined();
    expect(on.find((x) => x.id === `plan:windowClose:${d}`)).toBeDefined();
    expect(on.find((x) => x.id === `plan:windowOpen:${d}`)).toBeUndefined();
    const off = planNotifications(today, si, start, R({ ramadan: false }));
    const w = off.find((x) => x.id === `plan:windowOpen:${d}`)!;
    expect(w.at).toBe(epochFromLocal(d, dayPlan(d, si).times!.maghrib));
  });
});

describe('planNotifications, IF window', () => {
  const today = day('2026-12-01');
  const start = epochFromLocal(today, 0);
  it('16 h: open 12:00, close 19:30', () => {
    const l = planNotifications(today, mk({ ifOn: true }), start, R());
    const open = kinds(l, 'windowOpen');
    const close = kinds(l, 'windowClose');
    expect(open).toHaveLength(7);
    expect(close).toHaveLength(7);
    expect(open[0]!.at).toBe(epochFromLocal(today, 12 * 60));
    expect(close[0]!.at).toBe(epochFromLocal(today, 19 * 60 + 30));
    expect(open[0]!.params).toEqual({ to: '20:00' });
    expect(close[0]!.params).toEqual({ to: '20:00' });
  });
  it('minor gets none', () => {
    expect(planNotifications(today, mk({ ifOn: true }, { minor: true }), start, R())).toEqual([]);
  });
});

describe('planNotifications, nafila', () => {
  const s = mk({ nafila: true });
  it('evening before a suggestion, unless already fasted', () => {
    const start = day('2026-12-01');
    let d = start;
    while (dayPlan(d, s).nafila === null && d < start + 60) d++;
    const sug = dayPlan(d, s);
    expect(sug.nafila).not.toBeNull();
    const eveDay = d - 1;
    const l = planNotifications(eveDay, s, epochFromLocal(eveDay, 0), R());
    const it1 = l.find((x) => x.id === `plan:nafila:${eveDay}`)!;
    expect(it1.params).toEqual({ reason: sug.nafila });
    const l2 = planNotifications(eveDay, { ...s, nafilaDays: { [d]: true } }, epochFromLocal(eveDay, 0), R());
    expect(l2.find((x) => x.id === `plan:nafila:${eveDay}`)).toBeUndefined();
  });
});

describe('planNotifications, switches and properties', () => {
  const all = mk({ orthodox: true, ramadan: true, ifOn: true });
  const today = day('2027-02-07');
  const start = epochFromLocal(today, 0);
  it('switches remove their kinds', () => {
    const k = (r: Partial<Reminders>) => new Set(planNotifications(today, all, start, R(r)).map((x) => x.kind));
    expect(k({ evening: false }).has('eve')).toBe(false);
    expect(k({ ramadan: false }).has('sehur')).toBe(false);
    expect(k({ ramadan: false }).has('iftar')).toBe(false);
    expect(k({ window: false }).has('windowClose')).toBe(false);
    expect(k({ window: false }).has('windowOpen')).toBe(false);
    expect(k({ evening: true }).has('eve')).toBe(true);
  });
  it('all off gives []', () => {
    const off = { evening: false, ramadan: false, window: false, ifEnd: false };
    expect(planNotifications(today, all, start, off)).toEqual([]);
  });
  it('property: sorted, unique, future, bounded', () => {
    const lo = day('2026-01-01');
    fc.assert(
      fc.property(
        fc.integer({ min: lo, max: lo + 365 * 3 }),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.integer({ min: 0, max: 1439 }),
        (t: DayNum, orthodox, ramadan, ifOn, nafila, min) => {
          const s = mk({ orthodox, ramadan, ifOn, nafila });
          const now = epochFromLocal(t, min);
          const l = planNotifications(t, s, now, DEFAULT_REMINDERS);
          expect(new Set(l.map((x) => x.id)).size).toBe(l.length);
          expect(l.length).toBeLessThanOrEqual(MAX_PLANNED);
          l.forEach((x, i) => {
            expect(x.id.startsWith('plan:')).toBe(true);
            expect(x.at).toBeGreaterThan(now);
            expect(x.at - now).toBeLessThan(8 * 86400000);
            if (i > 0) expect(x.at).toBeGreaterThanOrEqual(l[i - 1]!.at);
          });
        },
      ),
      { numRuns: 60 },
    );
  });
});

describe('parseReminders', () => {
  it('defaults', () => {
    for (const v of [undefined, null, 'x', {}, 5, []]) {
      expect(parseReminders(v)).toEqual(DEFAULT_REMINDERS);
    }
  });
  it('keeps booleans, falls back on junk', () => {
    expect(parseReminders({ evening: false, ramadan: 'no', window: false, ifEnd: 0 })).toEqual({
      evening: false,
      ramadan: true,
      window: false,
      ifEnd: true,
    });
  });
});

describe('ifEndParams', () => {
  it('16 h ending 12:00', () => {
    const at = epochFromLocal(day('2026-12-02'), 12 * 60);
    expect(ifEndParams(at, 16)).toEqual({ h: '16', to: '20:00' });
  });
  it('wraps past midnight', () => {
    const at = epochFromLocal(day('2026-12-02'), 20 * 60);
    expect(ifEndParams(at, 12)).toEqual({ h: '12', to: '08:00' });
  });
});
