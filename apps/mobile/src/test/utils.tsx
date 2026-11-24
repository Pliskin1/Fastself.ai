import { DEFAULT_SETTINGS } from '@fastself/core';
import type { Practices, Settings } from '@fastself/core';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setDb } from '@/db';
import { setIdGenerator } from '@/db/ids';
import type { AppSettings, Db } from '@/db/types';
import { freezeClock, parseIsoLocal } from '@/lib/clock';
import { rehydrateSettings, updateSettings } from '@/store/settings';
import { createMemoryDb } from './memoryDb';

// Test helpers for every screen and data test. Import as `@/test/utils`. Jest only: never import from app code.

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Practice flags may be given at the top level: `fixtureSettings({ orthodox: true, strictness: 'ulje' })`. */
export type FixturePatch = Partial<AppSettings> & Partial<Practices>;

/**
 * Epoch ms of a Podgorica local time, for example `at('2026-12-02T16:30')`.
 * Throws on anything that is not `YYYY-MM-DDTHH:MM` (seconds optional), so a typo fails the test.
 */
export function at(isoLocal: string): number {
  const epochMs = parseIsoLocal(isoLocal);
  if (epochMs === null) throw new Error(`at(): expected YYYY-MM-DDTHH:MM, got "${isoLocal}"`);
  return epochMs;
}

/**
 * Settings for a test: onboarded, no practices, Podgorica, MWL, offsets 0 (the conditions of the golden tables in
 * docs/TESTING.md §3.5), changed by the patch.
 */
export function fixtureSettings(patch: FixturePatch = {}): AppSettings {
  const { orthodox, ramadan, nafila, ifOn, practices, ...rest } = patch;
  const merged: Practices = { ...DEFAULT_SETTINGS.practices, ...practices };
  if (orthodox !== undefined) merged.orthodox = orthodox;
  if (ramadan !== undefined) merged.ramadan = ramadan;
  if (nafila !== undefined) merged.nafila = nafila;
  if (ifOn !== undefined) merged.ifOn = ifOn;
  return { ...DEFAULT_SETTINGS, prayerMethod: 'mwl', onboarded: true, ...rest, practices: merged };
}

/**
 * Starts a test from a fresh install: a new, empty in-memory SQLite with the real schema, and the settings store
 * reset to it. Use it directly in data tests; `withProviders` calls it for screen tests.
 */
export function installTestDb(): Db {
  setIdGenerator(() => globalThis.crypto.randomUUID());
  const db = createMemoryDb();
  setDb(db);
  rehydrateSettings();
  return db;
}

/**
 * Wraps a screen for `render()`. Each call starts from a fresh database holding `settings` (default
 * `fixtureSettings()`), and stops the app clock at `now` (default: the real, running clock).
 *
 *   await render(withProviders(<Danas />, { settings: fixtureSettings({ orthodox: true }), now: at('2026-12-02T16:30') }));
 */
export function withProviders(
  el: ReactElement,
  options: { settings?: Settings | AppSettings; now?: number } = {},
): ReactElement {
  installTestDb();
  updateSettings({ onboarded: true, ...(options.settings ?? fixtureSettings()) });
  freezeClock(options.now ?? null);
  return <SafeAreaProvider initialMetrics={METRICS}>{el}</SafeAreaProvider>;
}
