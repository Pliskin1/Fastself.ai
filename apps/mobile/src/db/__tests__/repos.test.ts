import { DEFAULT_SETTINGS, toDayNum } from '@fastself/core';
import { setDb } from '@/db';
import { consents, dayMarks, fastingSessions, safety } from '@/db/repo';
import { kvSet } from '@/db/repo/kv';
import type { Db } from '@/db/types';
import { freezeClock } from '@/lib/clock';
import { getSettings, rehydrateSettings, updateSettings } from '@/store/settings';
import { at, installTestDb } from '@/test/utils';

const DEC_2 = toDayNum(2026, 12, 2);

function restart(db: Db): void {
  setDb(db);
  rehydrateSettings();
}

const outbox = (db: Db) => db.all<{ tbl: string; op: string }>('SELECT tbl, op FROM outbox ORDER BY seq');

let db: Db;
beforeEach(() => {
  db = installTestDb();
  freezeClock(at('2026-12-02T16:30'));
});
afterAll(() => freezeClock(null));

describe('consents', () => {
  it('every consent is off until it is given, and each kind is separate', () => {
    expect(['ai', 'practices', 'allergies', 'history'].map((kind) => consents.get(kind as 'ai'))).toEqual([
      false,
      false,
      false,
      false,
    ]);
    consents.set('ai', true);
    consents.set('history', true);
    expect(consents.get('ai')).toBe(true);
    expect(consents.get('history')).toBe(true);
    expect(consents.get('practices')).toBe(false);
    expect(consents.get('allergies')).toBe(false);
  });

  it('a consent survives a restart and can be withdrawn', () => {
    consents.set('ai', true);
    restart(db);
    expect(consents.get('ai')).toBe(true);
    consents.set('ai', false);
    restart(db);
    expect(consents.get('ai')).toBe(false);
  });
});

describe('safety', () => {
  it('stores the answers locally and reads them back after a restart', () => {
    expect(safety.all()).toEqual({ preg: false, diab: false, ed: false, minor: false });
    safety.set('preg', true);
    safety.set('ed', true);
    safety.set('ed', false);
    restart(db);
    expect(safety.all()).toEqual({ preg: true, diab: false, ed: false, minor: false });
  });

  it('minor is the same value as Settings.minor, whichever side sets it', () => {
    safety.set('minor', true);
    expect(getSettings().minor).toBe(true);
    updateSettings({ minor: false });
    expect(safety.get('minor')).toBe(false);
    updateSettings({ minor: true });
    restart(db);
    expect(safety.get('minor')).toBe(true);
  });
});

describe('dayMarks', () => {
  it('an exception shows up in the settings at once and survives a restart', () => {
    dayMarks.setException(DEC_2, 'zdravlje');
    expect(getSettings().exceptions).toEqual({ [DEC_2]: 'zdravlje' });
    restart(db);
    expect(getSettings().exceptions).toEqual({ [DEC_2]: 'zdravlje' });
  });

  it('clear removes only that day, and clearing a day without an exception does nothing', () => {
    dayMarks.setException(DEC_2, 'zdravlje');
    dayMarks.setException(DEC_2 + 1, 'putovanje');
    dayMarks.clear(DEC_2);
    dayMarks.clear(DEC_2 + 5);
    restart(db);
    expect(getSettings().exceptions).toEqual({ [DEC_2 + 1]: 'putovanje' });
  });

  it('list returns the marks of a range, both ends included, oldest first', () => {
    dayMarks.setException(DEC_2 - 1, 'drugo');
    dayMarks.setException(DEC_2, 'zdravlje');
    dayMarks.setException(DEC_2 + 3, 'putovanje');
    updateSettings({ nafilaDays: { [DEC_2 + 1]: true } });
    dayMarks.clear(DEC_2 - 1);

    expect(dayMarks.list(DEC_2, DEC_2 + 3)).toEqual([
      { n: DEC_2, kind: 'exception', reason: 'zdravlje' },
      { n: DEC_2 + 1, kind: 'nafila', reason: null },
      { n: DEC_2 + 3, kind: 'exception', reason: 'putovanje' },
    ]);
    expect(dayMarks.list(DEC_2 - 10, DEC_2 - 1)).toEqual([]);
    expect(dayMarks.list(DEC_2 + 1, DEC_2 + 2)).toEqual([{ n: DEC_2 + 1, kind: 'nafila', reason: null }]);
  });
});

describe('fastingSessions', () => {
  it('start begins a fast at the app clock and current returns it, also after a restart', () => {
    expect(fastingSessions.current()).toBeNull();
    const session = fastingSessions.start(16);
    expect(session).toEqual({
      id: expect.any(String),
      startedAt: at('2026-12-02T16:30'),
      endedAt: null,
      targetHours: 16,
      kind: 'if',
    });
    expect(fastingSessions.current()).toEqual(session);
    restart(db);
    expect(fastingSessions.current()).toEqual(session);
  });

  it('starting again while a fast runs returns the running fast unchanged', () => {
    const first = fastingSessions.start(16);
    freezeClock(at('2026-12-02T18:00'));
    expect(fastingSessions.start(12)).toEqual(first);
    expect(db.first<{ c: number }>('SELECT COUNT(*) AS c FROM fasting_sessions')?.c).toBe(1);
  });

  it('stop ends the running fast at the app clock; stopping with nothing running returns null', () => {
    expect(fastingSessions.stop()).toBeNull();
    const started = fastingSessions.start(14);
    freezeClock(at('2026-12-03T07:00'));
    expect(fastingSessions.stop()).toEqual({ ...started, endedAt: at('2026-12-03T07:00') });
    expect(fastingSessions.current()).toBeNull();
    expect(fastingSessions.stop()).toBeNull();
  });

  it('a fast never ends before it started, even if the dev clock is moved back', () => {
    const started = fastingSessions.start(16);
    freezeClock(at('2026-12-01T10:00'));
    expect(fastingSessions.stop()?.endedAt).toBe(started.startedAt);
  });

  it('last7 gives seven days, oldest first, with the fast counted on the day it ended', () => {
    freezeClock(at('2026-12-01T20:00'));
    fastingSessions.start(16);
    freezeClock(at('2026-12-02T12:00'));
    fastingSessions.stop(); // 16 h, ended on 2 Dec
    freezeClock(at('2026-12-04T19:30'));
    fastingSessions.start(14);
    freezeClock(at('2026-12-05T10:00'));
    fastingSessions.stop(); // 14.5 h, ended on 5 Dec

    freezeClock(at('2026-12-05T21:00'));
    const today = toDayNum(2026, 12, 5);
    expect(fastingSessions.last7()).toEqual([
      { n: today - 6, hours: 0, running: false },
      { n: today - 5, hours: 0, running: false },
      { n: today - 4, hours: 0, running: false },
      { n: today - 3, hours: 16, running: false },
      { n: today - 2, hours: 0, running: false },
      { n: today - 1, hours: 0, running: false },
      { n: today, hours: 14.5, running: false },
    ]);
  });

  it('last7 counts the running fast on today and keeps the longest fast of a day', () => {
    freezeClock(at('2026-12-02T06:00'));
    fastingSessions.start(12);
    freezeClock(at('2026-12-02T08:00'));
    fastingSessions.stop(); // 2 h, ended today
    freezeClock(at('2026-12-02T20:00'));
    fastingSessions.start(16);
    freezeClock(at('2026-12-02T23:00'));
    expect(fastingSessions.last7()[6]).toEqual({ n: DEC_2, hours: 3, running: true });

    freezeClock(at('2026-12-02T21:00')); // one hour in: the finished 2 h fast is the longer one
    expect(fastingSessions.last7()[6]).toEqual({ n: DEC_2, hours: 2, running: false });
  });

  it('last7 leaves out fasts that ended more than six days ago', () => {
    freezeClock(at('2026-11-24T20:00'));
    fastingSessions.start(16);
    freezeClock(at('2026-11-25T12:00'));
    fastingSessions.stop();
    freezeClock(at('2026-12-02T16:30'));
    expect(fastingSessions.last7().every((day) => day.hours === 0)).toBe(true);
    freezeClock(at('2026-12-01T09:00')); // six days after 25 Nov: still inside
    expect(fastingSessions.last7()[0]).toEqual({ n: toDayNum(2026, 11, 25), hours: 16, running: false });
  });
});

describe('outbox', () => {
  const changeEverything = () => {
    updateSettings({
      practices: { ...DEFAULT_SETTINGS.practices, orthodox: true },
      allergies: ['gluten'],
      exceptions: { [DEC_2]: 'zdravlje' },
    });
    fastingSessions.start(16);
  };

  it('a guest never fills the outbox, even with every consent on', () => {
    consents.set('practices', true);
    consents.set('allergies', true);
    consents.set('history', true);
    changeEverything();
    expect(outbox(db)).toEqual([]);
  });

  it('a signed-in user without consent never fills the outbox', () => {
    kvSet(db, 'auth_user_id', 'user-1');
    changeEverything();
    expect(outbox(db)).toEqual([]);
  });

  it('a signed-in user queues only the tables whose consent is on', () => {
    kvSet(db, 'auth_user_id', 'user-1');
    consents.set('history', true);
    changeEverything();
    expect(outbox(db)).toEqual([
      { tbl: 'day_marks', op: 'upsert' },
      { tbl: 'fasting_sessions', op: 'upsert' },
    ]);

    consents.set('practices', true);
    consents.set('allergies', true);
    consents.set('history', false);
    updateSettings({ strictness: 'ulje', allergies: [], exceptions: {} });
    fastingSessions.stop();
    expect(outbox(db).slice(2)).toEqual([
      { tbl: 'practices', op: 'upsert' },
      { tbl: 'allergies', op: 'upsert' },
    ]);
  });

  it('queues the id of the row that changed', () => {
    kvSet(db, 'auth_user_id', 'user-1');
    consents.set('history', true);
    const session = fastingSessions.start(16);
    expect(db.all('SELECT tbl, row_id FROM outbox')).toEqual([{ tbl: 'fasting_sessions', row_id: session.id }]);
  });
});
