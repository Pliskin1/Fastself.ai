import { DEFAULT_REMINDERS, DEFAULT_SETTINGS, toDayNum } from '@fastself/core';
import { setDb } from '@/db';
import { kvGet, kvSet } from '@/db/repo/kv';
import type { AppSettings, Db } from '@/db/types';
import { getSettings, rehydrateSettings, resetLocalData, updateSettings } from '@/store/settings';
import { installTestDb } from '@/test/utils';

const DEC_2 = toDayNum(2026, 12, 2);
const FEB_8 = toDayNum(2027, 2, 8);
const NOV_30 = toDayNum(2026, 11, 30);

/** Every field differs from its default. */
const FULL: AppSettings = {
  practices: { orthodox: true, ramadan: true, nafila: true, ifOn: true },
  ifPlan: 14,
  strictness: 'riba',
  slavaId: 'nikola',
  allergies: ['gluten', 'jaja'],
  customAvoid: ['kivi', 'ljuta paprika'],
  diets: { vegetarian: true, vegan: false, halal: true },
  minor: true,
  city: 'bar',
  prayerMethod: 'mwl',
  offsets: { fajr: -2, maghrib: 3 },
  ramadanShift: 1,
  exceptions: { [DEC_2]: 'zdravlje', [FEB_8]: 'putovanje' },
  nafilaDays: { [NOV_30]: true },
  onboarded: true,
  reminders: { evening: false, ramadan: true, window: false, ifEnd: true },
};

/** An app restart: memory is gone, the same database is opened and read again. */
function restart(db: Db): AppSettings {
  setDb(db);
  rehydrateSettings();
  return getSettings();
}

const rows = <T>(db: Db, sql: string): T[] => db.all<T>(sql);

describe('settings persistence', () => {
  it('a fresh install has the default settings and is not onboarded', () => {
    installTestDb();
    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, onboarded: false, reminders: DEFAULT_REMINDERS });
  });

  it('the reminder switches are stored on the phone and survive a restart', () => {
    const db = installTestDb();
    updateSettings({ reminders: { ...DEFAULT_REMINDERS, evening: false } });
    expect(JSON.parse(kvGet(db, 'reminders') ?? '{}')).toEqual({ ...DEFAULT_REMINDERS, evening: false });
    expect(restart(db).reminders).toEqual({ ...DEFAULT_REMINDERS, evening: false });
  });

  it('broken or partial stored reminder switches fall back to on', () => {
    const db = installTestDb();
    kvSet(db, 'reminders', '{oops');
    expect(restart(db).reminders).toEqual(DEFAULT_REMINDERS);
    kvSet(db, 'reminders', '{"window":false,"ifEnd":"no"}');
    expect(restart(db).reminders).toEqual({ ...DEFAULT_REMINDERS, window: false });
  });

  it('wiping the phone turns every reminder switch back on', () => {
    installTestDb();
    updateSettings({ reminders: { evening: false, ramadan: false, window: false, ifEnd: false } });
    resetLocalData();
    expect(getSettings().reminders).toEqual(DEFAULT_REMINDERS);
  });

  it('every field survives an app restart', () => {
    const db = installTestDb();
    updateSettings(FULL);
    expect(getSettings()).toEqual(FULL);
    expect(restart(db)).toEqual(FULL);
  });

  it('a patch changes only its keys', () => {
    const db = installTestDb();
    updateSettings(FULL);
    updateSettings({ city: 'plav', strictness: 'ulje' });
    expect(restart(db)).toEqual({ ...FULL, city: 'plav', strictness: 'ulje' });
  });

  it('keeps each part of the settings in its own table', () => {
    const db = installTestDb();
    updateSettings(FULL);

    expect(JSON.parse(kvGet(db, 'settings') ?? '')).toEqual({
      city: 'bar',
      prayerMethod: 'mwl',
      offsets: { fajr: -2, maghrib: 3 },
      ramadanShift: 1,
    });
    expect(kvGet(db, 'onboarded')).toBe('1');
    expect(
      rows<{ practice: string; active: number; settings: string }>(
        db,
        'SELECT practice, active, settings FROM practices ORDER BY practice',
      ).map((row) => ({ ...row, settings: JSON.parse(row.settings) as unknown })),
    ).toEqual([
      { practice: 'if', active: 1, settings: { ifPlan: 14 } },
      { practice: 'nafila', active: 1, settings: {} },
      { practice: 'orthodox', active: 1, settings: { strictness: 'riba', slavaId: 'nikola' } },
      { practice: 'ramadan', active: 1, settings: {} },
    ]);
    expect(rows(db, 'SELECT kind, code, deleted FROM allergies ORDER BY kind, code')).toEqual([
      { kind: 'allergen', code: 'gluten', deleted: 0 },
      { kind: 'allergen', code: 'jaja', deleted: 0 },
      { kind: 'custom', code: 'kivi', deleted: 0 },
      { kind: 'custom', code: 'ljuta paprika', deleted: 0 },
      { kind: 'diet', code: 'halal', deleted: 0 },
      { kind: 'diet', code: 'vegetarian', deleted: 0 },
    ]);
    expect(rows(db, 'SELECT day, kind, reason, deleted FROM day_marks ORDER BY day')).toEqual([
      { day: '2026-11-30', kind: 'nafila', reason: null, deleted: 0 },
      { day: '2026-12-02', kind: 'exception', reason: 'zdravlje', deleted: 0 },
      { day: '2027-02-08', kind: 'exception', reason: 'putovanje', deleted: 0 },
    ]);
    expect(rows(db, 'SELECT key, value FROM safety')).toEqual([{ key: 'minor', value: 1 }]);
  });

  it('removing an allergy soft-deletes its row and adding it back revives the same row', () => {
    const db = installTestDb();
    updateSettings({ allergies: ['gluten', 'jaja'] });
    const id = db.first<{ id: string }>("SELECT id FROM allergies WHERE code = 'gluten'")?.id;

    updateSettings({ allergies: ['jaja'] });
    expect(rows(db, "SELECT deleted FROM allergies WHERE code = 'gluten'")).toEqual([{ deleted: 1 }]);
    expect(restart(db).allergies).toEqual(['jaja']);

    updateSettings({ allergies: ['jaja', 'gluten'] });
    expect(rows(db, "SELECT id, deleted FROM allergies WHERE code = 'gluten'")).toEqual([{ id, deleted: 0 }]);
    expect([...restart(db).allergies].sort()).toEqual(['gluten', 'jaja']);
  });

  it('turning a diet or a custom word off removes it after a restart', () => {
    const db = installTestDb();
    updateSettings({ customAvoid: ['kivi'], diets: { vegetarian: false, vegan: true, halal: false } });
    updateSettings({ customAvoid: [], diets: { vegetarian: true, vegan: false, halal: false } });
    const settings = restart(db);
    expect(settings.customAvoid).toEqual([]);
    expect(settings.diets).toEqual({ vegetarian: true, vegan: false, halal: false });
  });

  it('turning a practice off keeps its options and reuses its row', () => {
    const db = installTestDb();
    updateSettings({
      practices: { ...DEFAULT_SETTINGS.practices, orthodox: true },
      strictness: 'ulje',
      slavaId: 'jovan',
    });
    updateSettings({ practices: DEFAULT_SETTINGS.practices });
    const settings = restart(db);
    expect(settings.practices.orthodox).toBe(false);
    expect(settings.strictness).toBe('ulje');
    expect(settings.slavaId).toBe('jovan');
    expect(rows(db, "SELECT active FROM practices WHERE practice = 'orthodox'")).toEqual([{ active: 0 }]);
  });

  it('changing an exception reason updates the row and clearing it soft-deletes', () => {
    const db = installTestDb();
    updateSettings({ exceptions: { [DEC_2]: 'zdravlje' } });
    updateSettings({ exceptions: { [DEC_2]: 'putovanje' } });
    expect(rows(db, 'SELECT day, reason, deleted FROM day_marks')).toEqual([
      { day: '2026-12-02', reason: 'putovanje', deleted: 0 },
    ]);
    updateSettings({ exceptions: {} });
    expect(rows(db, 'SELECT day, deleted FROM day_marks')).toEqual([{ day: '2026-12-02', deleted: 1 }]);
    expect(restart(db).exceptions).toEqual({});
  });

  it('an update that changes nothing keeps the same settings object and writes nothing', () => {
    const db = installTestDb();
    updateSettings({ city: 'bar' });
    const before = getSettings();
    const stamp = db.first<{ updated_at: number }>("SELECT updated_at FROM kv WHERE key = 'settings'");
    updateSettings({ city: 'bar', strictness: undefined });
    expect(getSettings()).toBe(before);
    expect(db.first("SELECT updated_at FROM kv WHERE key = 'settings'")).toEqual(stamp);
  });

  it('bad stored data falls back to defaults instead of crashing the start', () => {
    const db = installTestDb();
    kvSet(db, 'settings', '{"city":"atlantida","prayerMethod":"mwl","offsets":"x","ramadanShift":1');
    db.exec(
      "INSERT INTO practices (id, practice, active, settings, updated_at) VALUES ('p1', 'if', 1, '{\"ifPlan\":99}', 1)",
    );
    db.exec(
      "INSERT INTO practices (id, practice, active, settings, updated_at) VALUES ('p2', 'orthodox', 1, '{oops', 1)",
    );
    db.exec(
      "INSERT INTO day_marks (id, day, kind, reason, updated_at) VALUES ('d1', 'yesterday', 'exception', 'zdravlje', 1)",
    );
    expect(restart(db)).toEqual({
      ...DEFAULT_SETTINGS,
      practices: { ...DEFAULT_SETTINGS.practices, orthodox: true, ifOn: true },
      onboarded: false,
      reminders: DEFAULT_REMINDERS,
    });

    kvSet(db, 'settings', '{"city":"atlantida","prayerMethod":"mwl","offsets":"x","ramadanShift":1}');
    const settings = restart(db);
    expect(settings.city).toBe('podgorica'); // unknown city: default
    expect(settings.offsets).toEqual({ fajr: 0, maghrib: 0 }); // wrong type: default
    expect(settings.prayerMethod).toBe('mwl'); // valid values next to bad ones are kept
    expect(settings.ramadanShift).toBe(1);
  });

  it('an unknown allergen code is dropped alone; the other allergies stay', () => {
    const db = installTestDb();
    updateSettings({ allergies: ['gluten', 'soja'] });
    db.exec("INSERT INTO allergies (id, kind, code, updated_at) VALUES ('a9', 'allergen', 'from-a-newer-app', 1)");
    db.exec("INSERT INTO allergies (id, kind, code, updated_at) VALUES ('a8', 'diet', 'carnivore', 1)");
    const settings = restart(db);
    expect([...settings.allergies].sort()).toEqual(['gluten', 'soja']);
    expect(settings.diets).toEqual(DEFAULT_SETTINGS.diets);
  });

  it('an exception without a reason (synced from another device) reads as "drugo"', () => {
    const db = installTestDb();
    db.exec(
      "INSERT INTO day_marks (id, day, kind, reason, updated_at) VALUES ('d1', '2026-12-02', 'exception', NULL, 1)",
    );
    db.exec(
      "INSERT INTO day_marks (id, day, kind, reason, updated_at) VALUES ('d2', '2026-12-03', 'kaza_done', NULL, 1)",
    );
    expect(restart(db).exceptions).toEqual({ [DEC_2]: 'drugo' });
  });

  it('the newest row wins when a practice has two rows, and deleted rows are ignored', () => {
    const db = installTestDb();
    const insert = (id: string, practice: string, active: number, settings: string, at: number, deleted = 0) =>
      db.run('INSERT INTO practices (id, practice, active, settings, updated_at, deleted) VALUES (?, ?, ?, ?, ?, ?)', [
        id,
        practice,
        active,
        settings,
        at,
        deleted,
      ]);
    insert('a', 'if', 1, '{"ifPlan":12}', 100);
    insert('b', 'if', 0, '{"ifPlan":14}', 200);
    insert('c', 'if', 1, '{"ifPlan":16}', 300, 1);
    insert('d', 'ramadan', 1, '{}', 50, 1);
    const settings = restart(db);
    expect(settings.practices.ifOn).toBe(false);
    expect(settings.ifPlan).toBe(14);
    expect(settings.practices.ramadan).toBe(false);

    updateSettings({ ifPlan: 16 }); // the write goes to the row that was read (b), not to the stale one (a)
    expect(rows(db, "SELECT id, settings FROM practices WHERE practice = 'if' AND deleted = 0 ORDER BY id")).toEqual([
      { id: 'a', settings: '{"ifPlan":12}' },
      { id: 'b', settings: '{"ifPlan":16}' },
    ]);
    expect(restart(db).ifPlan).toBe(16);
  });
});
