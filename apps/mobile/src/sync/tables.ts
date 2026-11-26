import { DEFAULT_SETTINGS, SettingsSchema } from '@fastself/core';
import type { SyncTable } from '@/db/outbox';
import type { SqlValue } from '@/db/types';

// One spec per synced table: local name, server name, consent group, the column map both ways and a check of each
// server row that mirrors the local CHECK and NOT NULL constraints. Server and local column names are the same.
// `day_marks.reason` is in no map: it never leaves the phone and a pull never overwrites it.

export type SyncGroup = 'practices' | 'allergies' | 'history';
export type ServerTable = 'user_practices' | 'user_allergies' | 'fasting_sessions' | 'day_marks' | 'meal_plans';

/** The groups in a fixed order. They are also the sync consent kinds. */
export const SYNC_GROUPS: readonly SyncGroup[] = ['practices', 'allergies', 'history'];

/** Local columns of one row the sync owns, without `id` and `updated_at`. */
export type LocalValues = Record<string, SqlValue>;

export interface TableSpec {
  local: SyncTable;
  server: ServerTable;
  group: SyncGroup;
  /** Local columns the sync owns besides `id` and `updated_at`. */
  columns: readonly string[];
  /** JSON text columns: compared by meaning, since jsonb comes back with its keys in another order. */
  json: readonly string[];
  /** The columns of the natural key, joined with ':' in this order; null for tables with random ids. */
  naturalKey: readonly string[] | null;
  /** True when the local table has a UNIQUE constraint on the natural key. */
  uniqueKey: boolean;
  /** True when the rows feed the settings store (`loadSettings`). */
  settings: boolean;
  /** The server columns of a local row, without `id`, `user_id` and `updated_at`. */
  toServer(row: LocalValues): Record<string, unknown>;
  /** The local values of a server row, or null when the row fails the local checks. */
  fromServer(row: Record<string, unknown>): LocalValues | null;
}

// --- Value helpers ------------------------------------------------------------------------------------------

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SERVER_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

/**
 * Epoch ms of a Postgres timestamptz as PostgREST returns it (`2026-11-26T10:00:00.123456+00:00`), or null.
 * The fraction is cut to milliseconds, since not every JS engine parses six digits.
 */
export function serverMs(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = SERVER_TIME.exec(value);
  if (!match) return null;
  const [, date, time, fraction = '', zone = 'Z'] = match;
  let tz = zone;
  if (tz !== 'Z') {
    const digits = tz.slice(1).replace(':', '');
    tz = `${tz[0]}${digits.slice(0, 2)}:${digits.slice(2, 4) || '00'}`;
  }
  const ms = Date.parse(`${date}T${time}.${fraction.padEnd(3, '0').slice(0, 3)}${tz}`);
  return Number.isFinite(ms) ? ms : null;
}

/** ISO string of epoch ms, or null when the number is no valid time (the server then refuses the row). */
export function isoOf(ms: SqlValue | undefined): string | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function parseJson(text: SqlValue | undefined): unknown {
  if (typeof text !== 'string') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** JSON with the object keys sorted, to compare two values by meaning. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

const flag = (value: SqlValue | undefined): boolean => value === 1;
const bit = (value: boolean): number => (value ? 1 : 0);
const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value);

const PRACTICES = ['orthodox', 'ramadan', 'nafila', 'if'] as const;
const ALLERGY_KINDS = ['allergen', 'custom', 'diet'] as const;
const MARK_KINDS = ['exception', 'nafila', 'kaza_done'] as const;
const SESSION_KINDS = ['if', 'nafila'] as const;
const IF_HOURS = [12, 14, 16];

// --- Specs --------------------------------------------------------------------------------------------------

export const TABLES: readonly TableSpec[] = [
  {
    local: 'practices',
    server: 'user_practices',
    group: 'practices',
    columns: ['practice', 'active', 'settings', 'deleted'],
    json: ['settings'],
    naturalKey: ['practice'],
    uniqueKey: false,
    settings: true,
    toServer: (row) => {
      const settings = parseJson(row.settings);
      return {
        practice: row.practice,
        active: flag(row.active),
        settings: isObject(settings) ? settings : {},
        deleted: flag(row.deleted),
      };
    },
    fromServer: (row) => {
      if (!oneOf(PRACTICES, row.practice) || typeof row.active !== 'boolean') return null;
      if (!isObject(row.settings) || typeof row.deleted !== 'boolean') return null;
      return {
        practice: row.practice,
        active: bit(row.active),
        settings: JSON.stringify(row.settings),
        deleted: bit(row.deleted),
      };
    },
  },
  {
    local: 'allergies',
    server: 'user_allergies',
    group: 'allergies',
    columns: ['kind', 'code', 'deleted'],
    json: [],
    naturalKey: ['kind', 'code'],
    uniqueKey: true,
    settings: true,
    toServer: (row) => ({ kind: row.kind, code: row.code, deleted: flag(row.deleted) }),
    fromServer: (row) => {
      if (!oneOf(ALLERGY_KINDS, row.kind) || typeof row.code !== 'string' || typeof row.deleted !== 'boolean') {
        return null;
      }
      return { kind: row.kind, code: row.code, deleted: bit(row.deleted) };
    },
  },
  {
    local: 'fasting_sessions',
    server: 'fasting_sessions',
    group: 'history',
    columns: ['started_at', 'ended_at', 'target_hours', 'kind', 'deleted'],
    json: [],
    naturalKey: null,
    uniqueKey: false,
    settings: false,
    toServer: (row) => ({
      started_at: isoOf(row.started_at),
      ended_at: row.ended_at === null ? null : isoOf(row.ended_at),
      target_hours: row.target_hours,
      kind: row.kind,
      deleted: flag(row.deleted),
    }),
    fromServer: (row) => {
      const started = serverMs(row.started_at);
      const ended = row.ended_at === null ? null : serverMs(row.ended_at);
      if (started === null || (row.ended_at !== null && ended === null)) return null;
      if (typeof row.target_hours !== 'number' || !IF_HOURS.includes(row.target_hours)) return null;
      if (!oneOf(SESSION_KINDS, row.kind) || typeof row.deleted !== 'boolean') return null;
      return {
        started_at: started,
        ended_at: ended,
        target_hours: row.target_hours,
        kind: row.kind,
        deleted: bit(row.deleted),
      };
    },
  },
  {
    local: 'day_marks',
    server: 'day_marks',
    group: 'history',
    columns: ['day', 'kind', 'deleted'],
    json: [],
    naturalKey: ['day', 'kind'],
    uniqueKey: true,
    settings: true,
    toServer: (row) => ({ day: row.day, kind: row.kind, deleted: flag(row.deleted) }),
    fromServer: (row) => {
      if (typeof row.day !== 'string' || !DAY.test(row.day)) return null;
      if (!oneOf(MARK_KINDS, row.kind) || typeof row.deleted !== 'boolean') return null;
      return { day: row.day, kind: row.kind, deleted: bit(row.deleted) };
    },
  },
  {
    local: 'meal_plans',
    server: 'meal_plans',
    group: 'history',
    columns: ['week_start', 'rule_pack_version', 'days', 'created_at', 'deleted'],
    json: ['days'],
    naturalKey: null,
    uniqueKey: false,
    settings: false,
    toServer: (row) => ({
      week_start: row.week_start,
      rule_pack_version: row.rule_pack_version,
      days: parseJson(row.days) ?? null,
      created_at: isoOf(row.created_at),
      deleted: flag(row.deleted),
    }),
    fromServer: (row) => {
      const created = serverMs(row.created_at);
      if (typeof row.week_start !== 'string' || !DAY.test(row.week_start)) return null;
      if (typeof row.rule_pack_version !== 'string' || !Array.isArray(row.days) || created === null) return null;
      if (typeof row.deleted !== 'boolean') return null;
      return {
        week_start: row.week_start,
        rule_pack_version: row.rule_pack_version,
        days: JSON.stringify(row.days),
        created_at: created,
        deleted: bit(row.deleted),
      };
    },
  },
];

export const tablesOf = (group: SyncGroup): TableSpec[] => TABLES.filter((spec) => spec.group === group);

/** The natural key of a row (`orthodox`, `custom:kivi`, `2026-12-02:exception`), or null for random-id tables. */
export function naturalKeyOf(spec: TableSpec, row: LocalValues): string | null {
  return spec.naturalKey ? spec.naturalKey.map((column) => String(row[column])).join(':') : null;
}

/** True when the two rows hold the same values in every column the sync owns. */
export function sameValues(spec: TableSpec, a: LocalValues, b: LocalValues): boolean {
  return spec.columns.every((column) =>
    spec.json.includes(column)
      ? canonical(parseJson(a[column])) === canonical(parseJson(b[column]))
      : a[column] === b[column],
  );
}

// --- Profile: kv 'settings' <-> profiles ---------------------------------------------------------------------

export interface ServerProfileValues {
  city: string | null;
  prayer_method: string;
  offsets: { fajr: number; maghrib: number };
  ramadan_shift: number;
}

/** What `deleteServerCopy` leaves in `profiles`: the column defaults, with no city. */
export const EMPTY_PROFILE: ServerProfileValues = {
  city: null,
  prayer_method: 'izcg',
  offsets: { fajr: 0, maghrib: 0 },
  ramadan_shift: 0,
};

/** The profile part of kv 'settings' as server columns. A missing or invalid field sends its default. */
export function profileToServer(json: string): ServerProfileValues {
  const raw = parseJson(json);
  const value = isObject(raw) ? raw : {};
  const shape = SettingsSchema.shape;
  const city = shape.city.safeParse(value.city);
  const method = shape.prayerMethod.safeParse(value.prayerMethod);
  const offsets = shape.offsets.safeParse(value.offsets);
  const shift = shape.ramadanShift.safeParse(value.ramadanShift);
  return {
    city: city.success ? city.data : DEFAULT_SETTINGS.city,
    prayer_method: method.success ? method.data : DEFAULT_SETTINGS.prayerMethod,
    offsets: offsets.success ? offsets.data : DEFAULT_SETTINGS.offsets,
    ramadan_shift: shift.success ? shift.data : DEFAULT_SETTINGS.ramadanShift,
  };
}

/**
 * The kv 'settings' object of a server profile, or null. A profile whose city is null was never set (or was reset by
 * "delete the server copy") and never replaces a local one; neither does one with an invalid field.
 */
export function profileFromServer(row: Record<string, unknown>): Record<string, unknown> | null {
  if (row.city === null || row.city === undefined) return null;
  const shape = SettingsSchema.shape;
  const city = shape.city.safeParse(row.city);
  const method = shape.prayerMethod.safeParse(row.prayer_method);
  const offsets = shape.offsets.safeParse(row.offsets);
  const shift = shape.ramadanShift.safeParse(row.ramadan_shift);
  if (!city.success || !method.success || !offsets.success || !shift.success) return null;
  return { city: city.data, prayerMethod: method.data, offsets: offsets.data, ramadanShift: shift.data };
}

/** True when kv 'settings' already holds this profile. */
export function sameProfile(json: string | null, profile: Record<string, unknown>): boolean {
  const raw = json === null ? undefined : parseJson(json);
  if (!isObject(raw)) return false;
  return (['city', 'prayerMethod', 'offsets', 'ramadanShift'] as const).every(
    (key) => canonical(raw[key]) === canonical(profile[key]),
  );
}
