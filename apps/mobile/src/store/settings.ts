import { createStore, type StoreApi } from 'zustand';
import { getDb, wipeLocalData } from '@/db';
import { loadSettings, saveSettings } from '@/db/repo/settings';
import type { AppSettings } from '@/db/types';

interface SettingsState {
  settings: AppSettings;
}

let store: StoreApi<SettingsState> | undefined;

/**
 * The settings store. The first use reads the settings from SQLite synchronously, so there is no loading state:
 * hooks return real data on the first render.
 */
export function settingsStore(): StoreApi<SettingsState> {
  store ??= createStore<SettingsState>(() => ({ settings: loadSettings(getDb()) }));
  return store;
}

export function getSettings(): AppSettings {
  return settingsStore().getState().settings;
}

/** Merges the patch at the top level, writes the difference to SQLite, then publishes the new settings. */
export function updateSettings(patch: Partial<AppSettings>): void {
  const api = settingsStore();
  const prev = api.getState().settings;
  const next: AppSettings = { ...prev };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) (next as unknown as Record<string, unknown>)[key] = value;
  }
  if (JSON.stringify(prev) === JSON.stringify(next)) return;
  saveSettings(getDb(), prev, next);
  api.setState({ settings: next });
}

/** Re-reads the settings from SQLite, after a wipe or after sync wrote rows directly. */
export function rehydrateSettings(): void {
  const settings = loadSettings(getDb());
  if (store) store.setState({ settings });
  else store = createStore<SettingsState>(() => ({ settings }));
}

/** "Obriši podatke sa telefona": wipes the local database (only `install_id` stays) and resets the store. */
export function resetLocalData(): void {
  wipeLocalData();
  rehydrateSettings();
}
