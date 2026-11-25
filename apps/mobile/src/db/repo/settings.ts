import { DEFAULT_SETTINGS, SettingsSchema, isoDate, parseIsoDate, parseReminders } from '@fastself/core';
import type { AllergenId, DayNum, ExceptionReason, Settings } from '@fastself/core';
import { newId } from '../ids';
import { enqueue } from '../outbox';
import type { AppSettings, Db } from '../types';
import { kvGet, kvSet } from './kv';

// Where each part of Settings lives (docs/DATABASE.md §1). Every field has exactly one home:
//   kv 'settings'   city, prayerMethod, offsets, ramadanShift (the profile part)
//   kv 'onboarded'  onboarded
//   kv 'reminders'  the reminder switches (local only, never synced)
//   practices       one row per practice: orthodox {strictness, slavaId}, ramadan, nafila, if {ifPlan}
//   allergies       allergen ids, custom avoid words and diets (kind = allergen | custom | diet)
//   day_marks       exceptions (with the local-only reason) and chosen nafila days
//   safety          minor (local only)

type PracticeName = 'orthodox' | 'ramadan' | 'nafila' | 'if';
type DietName = keyof Settings['diets'];
type Profile = Pick<Settings, 'city' | 'prayerMethod' | 'offsets' | 'ramadanShift'>;

interface PracticeRow {
  practice: PracticeName;
  active: number;
  settings: string;
}
interface AllergyRow {
  kind: 'allergen' | 'custom' | 'diet';
  code: string;
}
interface MarkRow {
  day: string;
  kind: 'exception' | 'nafila';
  reason: string | null;
}

const PRACTICE_NAMES: readonly PracticeName[] = ['orthodox', 'ramadan', 'nafila', 'if'];
const DIET_NAMES: readonly DietName[] = ['vegetarian', 'vegan', 'halal'];
const REASONS: readonly ExceptionReason[] = ['zdravlje', 'putovanje', 'drugo'];

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

function parseObject(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    const value: unknown = JSON.parse(json);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Keeps every stored value that passes the core schema; anything missing or invalid falls back to its default. */
function sanitize(raw: Record<string, unknown>): Settings {
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(SettingsSchema.shape) as (keyof typeof SettingsSchema.shape)[]) {
    if (raw[key] === undefined) continue;
    const parsed = SettingsSchema.shape[key].safeParse(raw[key]);
    if (parsed.success) out[key] = parsed.data;
  }
  return out as unknown as Settings;
}

function profileOf(s: Settings): Profile {
  return { city: s.city, prayerMethod: s.prayerMethod, offsets: s.offsets, ramadanShift: s.ramadanShift };
}

function practiceStates(s: Settings): Record<PracticeName, { active: boolean; settings: Record<string, unknown> }> {
  return {
    orthodox: { active: s.practices.orthodox, settings: { strictness: s.strictness, slavaId: s.slavaId } },
    ramadan: { active: s.practices.ramadan, settings: {} },
    nafila: { active: s.practices.nafila, settings: {} },
    if: { active: s.practices.ifOn, settings: { ifPlan: s.ifPlan } },
  };
}

/** Allergy rows as `kind:code` keys. */
function allergyKeys(s: Settings): Set<string> {
  return new Set([
    ...s.allergies.map((code) => `allergen:${code}`),
    ...s.customAvoid.map((word) => `custom:${word}`),
    ...DIET_NAMES.filter((diet) => s.diets[diet]).map((diet) => `diet:${diet}`),
  ]);
}

/** Day mark rows as `kind:YYYY-MM-DD` keys, with the exception reason as the value. */
function markEntries(s: Settings): Map<string, ExceptionReason | null> {
  const out = new Map<string, ExceptionReason | null>();
  for (const [n, reason] of Object.entries(s.exceptions)) out.set(`exception:${isoDate(Number(n))}`, reason);
  for (const n of Object.keys(s.nafilaDays)) out.set(`nafila:${isoDate(Number(n))}`, null);
  return out;
}

const splitKey = (key: string): [string, string] => {
  const at = key.indexOf(':');
  return [key.slice(0, at), key.slice(at + 1)];
};

/** Rebuilds the settings from the tables. Never throws on bad stored data. */
export function loadSettings(db: Db): AppSettings {
  const raw: Record<string, unknown> = parseObject(kvGet(db, 'settings'));

  // Later rows win, so two rows of one practice (possible after a sync from another device) resolve to the newest.
  const practices = { ...DEFAULT_SETTINGS.practices };
  const practiceRows = db.all<PracticeRow>(
    'SELECT practice, active, settings FROM practices WHERE deleted = 0 ORDER BY updated_at, id',
  );
  for (const row of practiceRows) {
    const extra = parseObject(row.settings);
    const active = row.active === 1;
    if (row.practice === 'orthodox') {
      practices.orthodox = active;
      if (extra.strictness !== undefined) raw.strictness = extra.strictness;
      if (extra.slavaId !== undefined) raw.slavaId = extra.slavaId;
    } else if (row.practice === 'if') {
      practices.ifOn = active;
      if (extra.ifPlan !== undefined) raw.ifPlan = extra.ifPlan;
    } else {
      practices[row.practice] = active;
    }
  }
  raw.practices = practices;

  // One unknown code must not drop the whole list: allergies are a safety matter, so each code is checked alone.
  const allergies: AllergenId[] = [];
  const customAvoid: string[] = [];
  const diets = { ...DEFAULT_SETTINGS.diets };
  const allergyRows = db.all<AllergyRow>(
    'SELECT kind, code FROM allergies WHERE deleted = 0 ORDER BY updated_at, code',
  );
  for (const row of allergyRows) {
    if (row.kind === 'allergen') {
      const code = SettingsSchema.shape.allergies.element.safeParse(row.code);
      if (code.success) allergies.push(code.data);
    } else if (row.kind === 'custom') {
      customAvoid.push(row.code);
    } else if ((DIET_NAMES as readonly string[]).includes(row.code)) {
      diets[row.code as DietName] = true;
    }
  }
  raw.allergies = allergies;
  raw.customAvoid = customAvoid;
  raw.diets = diets;

  const exceptions: Record<DayNum, ExceptionReason> = {};
  const nafilaDays: Record<DayNum, true> = {};
  const markRows = db.all<MarkRow>(
    "SELECT day, kind, reason FROM day_marks WHERE deleted = 0 AND kind IN ('exception', 'nafila')",
  );
  for (const row of markRows) {
    const n = parseIsoDate(row.day);
    if (n === null) continue;
    if (row.kind === 'nafila') nafilaDays[n] = true;
    // The reason never leaves the device, so an exception synced from another device arrives without one.
    else exceptions[n] = REASONS.find((reason) => reason === row.reason) ?? 'drugo';
  }
  raw.exceptions = exceptions;
  raw.nafilaDays = nafilaDays;

  raw.minor = db.first<{ value: number }>("SELECT value FROM safety WHERE key = 'minor'")?.value === 1;

  return {
    ...sanitize(raw),
    onboarded: kvGet(db, 'onboarded') === '1',
    reminders: parseReminders(parseObject(kvGet(db, 'reminders'))),
  };
}

/**
 * Writes the difference between prev and next, in one transaction. `prev` must be what the database holds
 * (the store keeps it that way). Syncable rows are queued in the outbox when sync is allowed.
 */
export function saveSettings(db: Db, prev: AppSettings, next: AppSettings): void {
  db.transaction(() => {
    const now = Date.now();

    if (!same(profileOf(prev), profileOf(next))) kvSet(db, 'settings', JSON.stringify(profileOf(next)));
    if (prev.onboarded !== next.onboarded) kvSet(db, 'onboarded', next.onboarded ? '1' : '0');
    if (!same(prev.reminders, next.reminders)) kvSet(db, 'reminders', JSON.stringify(next.reminders));
    if (prev.minor !== next.minor) {
      db.run(
        "INSERT INTO safety (key, value) VALUES ('minor', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [next.minor ? 1 : 0],
      );
    }

    const before = practiceStates(prev);
    const after = practiceStates(next);
    for (const name of PRACTICE_NAMES) {
      if (same(before[name], after[name])) continue;
      const active = after[name].active ? 1 : 0;
      const settings = JSON.stringify(after[name].settings);
      const row = db.first<{ id: string }>(
        'SELECT id FROM practices WHERE practice = ? AND deleted = 0 ORDER BY updated_at DESC, id DESC LIMIT 1',
        [name],
      );
      const id = row?.id ?? newId();
      if (row) {
        db.run('UPDATE practices SET active = ?, settings = ?, updated_at = ? WHERE id = ?', [
          active,
          settings,
          now,
          id,
        ]);
      } else {
        db.run('INSERT INTO practices (id, practice, active, settings, updated_at) VALUES (?, ?, ?, ?, ?)', [
          id,
          name,
          active,
          settings,
          now,
        ]);
      }
      enqueue(db, 'practices', id);
    }

    const oldAllergies = allergyKeys(prev);
    const newAllergies = allergyKeys(next);
    for (const key of newAllergies) {
      if (oldAllergies.has(key)) continue;
      const [kind, code] = splitKey(key);
      db.run(
        'INSERT INTO allergies (id, kind, code, updated_at) VALUES (?, ?, ?, ?) ' +
          'ON CONFLICT(kind, code) DO UPDATE SET deleted = 0, updated_at = excluded.updated_at',
        [newId(), kind, code, now],
      );
      queueRow(db, 'allergies', 'SELECT id FROM allergies WHERE kind = ? AND code = ?', [kind, code]);
    }
    for (const key of oldAllergies) {
      if (newAllergies.has(key)) continue;
      const [kind, code] = splitKey(key);
      db.run('UPDATE allergies SET deleted = 1, updated_at = ? WHERE kind = ? AND code = ?', [now, kind, code]);
      queueRow(db, 'allergies', 'SELECT id FROM allergies WHERE kind = ? AND code = ?', [kind, code]);
    }

    const oldMarks = markEntries(prev);
    const newMarks = markEntries(next);
    for (const [key, reason] of newMarks) {
      if (oldMarks.has(key) && oldMarks.get(key) === reason) continue;
      const [kind, day] = splitKey(key);
      db.run(
        'INSERT INTO day_marks (id, day, kind, reason, updated_at) VALUES (?, ?, ?, ?, ?) ' +
          'ON CONFLICT(day, kind) DO UPDATE SET reason = excluded.reason, deleted = 0, updated_at = excluded.updated_at',
        [newId(), day, kind, reason, now],
      );
      queueRow(db, 'day_marks', 'SELECT id FROM day_marks WHERE day = ? AND kind = ?', [day, kind]);
    }
    for (const key of oldMarks.keys()) {
      if (newMarks.has(key)) continue;
      const [kind, day] = splitKey(key);
      db.run('UPDATE day_marks SET deleted = 1, updated_at = ? WHERE day = ? AND kind = ?', [now, day, kind]);
      queueRow(db, 'day_marks', 'SELECT id FROM day_marks WHERE day = ? AND kind = ?', [day, kind]);
    }
  });
}

function queueRow(db: Db, tbl: 'allergies' | 'day_marks', sql: string, params: string[]): void {
  const row = db.first<{ id: string }>(sql, params);
  if (row) enqueue(db, tbl, row.id);
}
