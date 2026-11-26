import { toDayNum } from '@fastself/core';
import * as Sharing from 'expo-sharing';
import { consents, fastingSessions, safety } from '@/db/repo';
import { kvGet, kvSet } from '@/db/repo/kv';
import type { Db } from '@/db/types';
import { freezeClock } from '@/lib/clock';
import { buildExport, clearExportFiles, exportData, exportFileName } from '@/lib/export';
import { updateSettings } from '@/store/settings';
import { at, installTestDb } from '@/test/utils';

const mockFs = {
  writes: [] as { uri: string; content: string }[],
  failWrite: false,
  /** Names of the files in the cache directory. */
  files: [] as string[],
  failList: false,
};

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    name: string;
    constructor(dir: { uri: string }, name: string) {
      this.uri = `${dir.uri}${name}`;
      this.name = name;
    }
    create(): void {}
    async write(content: string): Promise<void> {
      if (mockFs.failWrite) throw new Error('disk full');
      mockFs.writes.push({ uri: this.uri, content });
      if (!mockFs.files.includes(this.name)) mockFs.files.push(this.name);
    }
    delete(): void {
      mockFs.files = mockFs.files.filter((name) => name !== this.name);
    }
  }
  const cache = {
    uri: 'file:///cache/',
    list: (): MockFile[] => {
      if (mockFs.failList) throw new Error('no cache directory');
      return mockFs.files.map((name) => new MockFile(cache, name));
    },
  };
  return { Paths: { cache }, File: MockFile };
});
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.2.3' } } }));

const isAvailable = jest.mocked(Sharing.isAvailableAsync);
const share = jest.mocked(Sharing.shareAsync);

const AUTH_USER = 'auth-user-7f3e9c1a-0000-4000-8000-0000000000aa';
const LAST_SYNC = '1777777777777';
const SHOP_ITEM = 'kupovina-test-stavka';
const GONE_SESSION = 'gone-session-0000-4000-8000-000000000001';
const NOW = at('2026-12-02T00:30'); // 1 Dec 23:30 UTC: the file name must use the Podgorica date

let db: Db;

/** A user with practices, allergies, safety answers, an exception with a reason, a fast, a plan and private kv. */
function seed(): void {
  updateSettings({
    onboarded: true,
    practices: { orthodox: true, ramadan: false, nafila: false, ifOn: true },
    strictness: 'ulje',
    allergies: ['gluten', 'mlijecno'],
    customAvoid: ['kivi'],
    exceptions: { [toDayNum(2026, 12, 3)]: 'putovanje' },
  });
  // A removed allergy stays as a soft-deleted row.
  updateSettings({ allergies: ['gluten'] });
  safety.set('preg', true);
  safety.set('diab', true);
  fastingSessions.start(16);
  db.run(
    'INSERT INTO fasting_sessions (id, started_at, ended_at, target_hours, updated_at, deleted) VALUES (?, ?, ?, ?, ?, 1)',
    [GONE_SESSION, NOW - 86_400_000, NOW - 40_000_000, 16, NOW],
  );
  db.run(
    'INSERT INTO meal_plans (id, week_start, rule_pack_version, days, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['plan-1', '2026-11-30', '0.1', '[{"day":"2026-11-30","meals":["m1"]}]', NOW, NOW],
  );
  db.run(
    'INSERT INTO meal_plans (id, week_start, rule_pack_version, days, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ['plan-2', '2026-12-07', '0.1', 'not json', NOW, NOW],
  );
  consents.set('ai', true);
  consents.set('history', true);
  kvSet(db, 'auth_user_id', AUTH_USER);
  kvSet(db, 'last_sync_at', LAST_SYNC);
  db.run("INSERT INTO outbox (tbl, row_id, op, created_at) VALUES ('allergies', 'outbox-row-x', 'upsert', 1)");
  db.run('INSERT INTO shopping_checks (item, checked) VALUES (?, 1)', [SHOP_ITEM]);
}

beforeEach(() => {
  db = installTestDb();
  freezeClock(NOW);
  mockFs.writes = [];
  mockFs.failWrite = false;
  mockFs.files = [];
  mockFs.failList = false;
  isAvailable.mockReset().mockResolvedValue(true);
  share.mockReset().mockResolvedValue(undefined);
});
afterEach(() => freezeClock(null));

describe('buildExport', () => {
  it('has exactly the documented top-level keys, in order', () => {
    seed();
    const out = buildExport(db, NOW);
    expect(Object.keys(out)).toEqual([
      'app',
      'version',
      'exported_at',
      'settings',
      'practices',
      'allergies',
      'fasting_sessions',
      'day_marks',
      'meal_plans',
    ]);
    expect(out.app).toBe('fastself.ai');
    expect(out.version).toBe('1.2.3');
    expect(out.exported_at).toBe(new Date(NOW).toISOString());
  });

  it('carries the settings, every safety answer and the exception reason', () => {
    seed();
    const out = buildExport(db, NOW);
    expect(out.settings.allergies).toEqual(['gluten']);
    expect(out.settings.customAvoid).toEqual(['kivi']);
    expect(out.settings.practices).toEqual({ orthodox: true, ramadan: false, nafila: false, ifOn: true });
    expect(out.settings.safety).toEqual({ preg: true, diab: true, ed: false, minor: false });
    expect(out.day_marks).toEqual([
      expect.objectContaining({ day: '2026-12-03', kind: 'exception', reason: 'putovanje' }),
    ]);
  });

  it('lists live rows only, without the deleted column, with JSON columns parsed', () => {
    seed();
    const out = buildExport(db, NOW);
    expect(out.allergies.map((row) => `${row.kind}:${row.code}`)).toEqual(['allergen:gluten', 'custom:kivi']);
    expect(out.fasting_sessions).toHaveLength(1);
    expect(out.fasting_sessions[0]).toEqual(expect.objectContaining({ target_hours: 16, ended_at: null }));
    const tables = [out.practices, out.allergies, out.fasting_sessions, out.day_marks, out.meal_plans];
    for (const rows of tables) for (const row of rows) expect(row).not.toHaveProperty('deleted');
    expect(JSON.stringify(out)).not.toContain(GONE_SESSION);

    const orthodox = out.practices.find((row) => row.practice === 'orthodox');
    expect(orthodox?.settings).toEqual(expect.objectContaining({ strictness: 'ulje' }));
    expect(out.meal_plans.map((row) => row.days)).toEqual([
      [{ day: '2026-11-30', meals: ['m1'] }],
      'not json', // kept as the raw string when it does not parse
    ]);
  });

  it('leaves out install_id, auth_user_id, last_sync_at, consents, the outbox and shopping checks', () => {
    seed();
    const installId = kvGet(db, 'install_id');
    expect(installId).toBeTruthy();
    const text = JSON.stringify(buildExport(db, NOW), null, 2);
    for (const absent of [
      installId!,
      'install_id',
      AUTH_USER,
      'auth_user_id',
      LAST_SYNC,
      'last_sync_at',
      'consent',
      'outbox',
      'outbox-row-x',
      'shopping',
      SHOP_ITEM,
    ]) {
      expect(text).not.toContain(absent);
    }
  });

  it('works on a fresh install with empty tables', () => {
    const out = buildExport(db, NOW);
    expect(out.practices).toEqual([]);
    expect(out.meal_plans).toEqual([]);
    expect(out.settings.safety).toEqual({ preg: false, diab: false, ed: false, minor: false });
  });
});

describe('exportData', () => {
  it('names the file with the Podgorica date', () => {
    expect(exportFileName(NOW)).toBe('fastself-izvoz-2026-12-02.json');
    expect(exportFileName(at('2026-12-01T23:59'))).toBe('fastself-izvoz-2026-12-01.json');
  });

  it('writes the JSON into the cache directory and shares that file', async () => {
    seed();
    await expect(exportData()).resolves.toEqual({ ok: true });
    expect(mockFs.writes).toHaveLength(1);
    const { uri, content } = mockFs.writes[0]!;
    expect(uri).toBe('file:///cache/fastself-izvoz-2026-12-02.json');
    expect(content).toBe(JSON.stringify(buildExport(db, NOW), null, 2));
    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith(uri, { mimeType: 'application/json', UTI: 'public.json' });
  });

  it('answers unavailable when sharing is not available, and writes nothing', async () => {
    isAvailable.mockResolvedValue(false);
    await expect(exportData()).resolves.toEqual({ ok: false, error: 'unavailable' });
    expect(mockFs.writes).toHaveLength(0);
    expect(share).not.toHaveBeenCalled();
  });

  it('answers failed when the write throws, and does not share', async () => {
    mockFs.failWrite = true;
    await expect(exportData()).resolves.toEqual({ ok: false, error: 'failed' });
    expect(share).not.toHaveBeenCalled();
  });

  it('removes the export files of earlier runs before it writes the new one, and no other file', async () => {
    mockFs.files = ['fastself-izvoz-2026-11-20.json', 'ostalo.json', 'fastself-izvoz-2026-12-02.json.bak'];
    await expect(exportData()).resolves.toEqual({ ok: true });
    expect([...mockFs.files].sort()).toEqual([
      'fastself-izvoz-2026-12-02.json',
      'fastself-izvoz-2026-12-02.json.bak',
      'ostalo.json',
    ]);
  });

  it('clearExportFiles removes every export file and never throws', () => {
    mockFs.files = ['fastself-izvoz-2026-11-20.json', 'fastself-izvoz-2026-12-02.json', 'ostalo.json'];
    clearExportFiles();
    expect(mockFs.files).toEqual(['ostalo.json']);
    mockFs.failList = true;
    expect(() => clearExportFiles()).not.toThrow();
  });

  it('a second call while an export runs joins it: one write, one share, the same result', async () => {
    let closeSheet: () => void = () => undefined;
    share.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          closeSheet = resolve;
        }),
    );
    const first = exportData();
    const second = exportData();
    expect(second).toBe(first);
    for (let i = 0; i < 50 && share.mock.calls.length === 0; i++) await Promise.resolve();
    expect(share).toHaveBeenCalledTimes(1);
    const third = exportData(); // the share sheet is open: still the same export
    expect(third).toBe(first);
    closeSheet();
    const results = await Promise.all([first, second, third]);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(results[1]).toBe(results[0]);
    expect(mockFs.writes).toHaveLength(1);
    expect(share).toHaveBeenCalledTimes(1);

    // Once it settled, the next call exports again.
    await expect(exportData()).resolves.toEqual({ ok: true });
    expect(mockFs.writes).toHaveLength(2);
    expect(share).toHaveBeenCalledTimes(2);
  });

  it('a failed export does not block the next one', async () => {
    mockFs.failWrite = true;
    await expect(exportData()).resolves.toEqual({ ok: false, error: 'failed' });
    mockFs.failWrite = false;
    await expect(exportData()).resolves.toEqual({ ok: true });
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('never rejects, whatever throws', async () => {
    isAvailable.mockRejectedValueOnce(new Error('no module'));
    await expect(exportData()).resolves.toEqual({ ok: false, error: 'failed' });
    share.mockRejectedValueOnce(new Error('sheet failed'));
    await expect(exportData()).resolves.toEqual({ ok: false, error: 'failed' });
  });
});
