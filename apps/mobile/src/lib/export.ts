import { isoDate, localFromEpoch } from '@fastself/core';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDb } from '@/db';
import type { SafetyKey } from '@/db/repo/safety';
import { loadSettings } from '@/db/repo/settings';
import type { AppSettings, Db, SqlValue } from '@/db/types';
import { nowMs } from './clock';

// "Izvezi podatke" (docs/DATABASE.md §6): the user's own copy of the local data, as a JSON file shared through the
// system share sheet. No network. Safety answers and exception reasons are included because the file is the user's
// own copy. Left out: install_id, auth_user_id, last_sync_at, the consent flags, the outbox and shopping_checks.
// The file stays in the app's cache directory until the next export or a wipe (see clearExportFiles).

export type ExportResult = { ok: true } | { ok: false; error: 'unavailable' | 'failed' };

export type ExportRow = Record<string, unknown>;

export interface ExportFile {
  app: 'fastself.ai';
  version: string;
  exported_at: string;
  /** loadSettings() plus every safety answer (Settings carries only `minor`). */
  settings: AppSettings & { safety: Record<SafetyKey, boolean> };
  practices: ExportRow[];
  allergies: ExportRow[];
  fasting_sessions: ExportRow[];
  day_marks: ExportRow[];
  meal_plans: ExportRow[];
}

const SAFETY_KEYS: readonly SafetyKey[] = ['preg', 'diab', 'ed', 'minor'];

/** Columns stored as JSON text that the file carries as parsed JSON. */
const JSON_COLUMNS = new Set(['settings', 'days']);

function parseJson(text: SqlValue): unknown {
  if (typeof text !== 'string') return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Live rows (deleted = 0) of one syncable table, without the `deleted` column. */
function liveRows(db: Db, table: string, orderBy: string): ExportRow[] {
  return db.all<Record<string, SqlValue>>(`SELECT * FROM ${table} WHERE deleted = 0 ORDER BY ${orderBy}`).map((row) => {
    const out: ExportRow = {};
    for (const [column, value] of Object.entries(row)) {
      if (column === 'deleted') continue;
      out[column] = JSON_COLUMNS.has(column) ? parseJson(value) : value;
    }
    return out;
  });
}

function safetyAnswers(db: Db): Record<SafetyKey, boolean> {
  const rows = db.all<{ key: string; value: number }>('SELECT key, value FROM safety');
  const answers: Record<SafetyKey, boolean> = { preg: false, diab: false, ed: false, minor: false };
  for (const key of SAFETY_KEYS) answers[key] = rows.some((row) => row.key === key && row.value === 1);
  return answers;
}

/** The export object, top-level keys in the documented order. Reads the database, writes nothing. */
export function buildExport(db: Db, now: number): ExportFile {
  return {
    app: 'fastself.ai',
    version: Constants.expoConfig?.version ?? '',
    exported_at: new Date(now).toISOString(),
    settings: { ...loadSettings(db), safety: safetyAnswers(db) },
    practices: liveRows(db, 'practices', 'practice, updated_at, id'),
    allergies: liveRows(db, 'allergies', 'kind, code'),
    fasting_sessions: liveRows(db, 'fasting_sessions', 'started_at, id'),
    day_marks: liveRows(db, 'day_marks', 'day, kind'),
    meal_plans: liveRows(db, 'meal_plans', 'week_start, created_at, id'),
  };
}

/** `fastself-izvoz-YYYY-MM-DD.json`, the date being today in Europe/Podgorica. */
export function exportFileName(now: number): string {
  return `fastself-izvoz-${isoDate(localFromEpoch(now).n)}.json`;
}

const EXPORT_FILE = /^fastself-izvoz-\d{4}-\d{2}-\d{2}\.json$/;

/**
 * Removes the export files left in the cache directory. A file cannot go as soon as the share sheet closes: on
 * Android the app that received it may still be reading it. So the old ones go at the next export and when the
 * phone is wiped (lib/account). Never throws.
 */
export function clearExportFiles(): void {
  try {
    for (const entry of Paths.cache.list()) {
      if (!(entry instanceof File) || !EXPORT_FILE.test(entry.name)) continue;
      try {
        entry.delete();
      } catch {
        // One file that cannot be removed must not keep the others.
      }
    }
  } catch {
    // The cache directory cannot be listed: nothing to remove.
  }
}

let inFlight: Promise<ExportResult> | null = null;

/**
 * Writes the export into the cache directory and opens the share sheet. Never throws. A call that arrives while an
 * export is running gets that export's promise, so a second tap cannot delete or rewrite the file being shared.
 */
export function exportData(): Promise<ExportResult> {
  inFlight ??= runExport().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runExport(): Promise<ExportResult> {
  try {
    if (!(await Sharing.isAvailableAsync())) return { ok: false, error: 'unavailable' };
    clearExportFiles();
    const now = nowMs();
    const file = new File(Paths.cache, exportFileName(now));
    file.create({ overwrite: true });
    await file.write(JSON.stringify(buildExport(getDb(), now), null, 2));
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
    return { ok: true };
  } catch {
    return { ok: false, error: 'failed' };
  }
}
