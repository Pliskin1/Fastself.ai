import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SettingsSchema, parseSettings } from '../src/index';

describe('settings', () => {
  it('DEFAULT_SETTINGS satisfies the schema', () => {
    expect(SettingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  });
  it('parseSettings fills missing keys from defaults', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ city: 'bar' }).city).toBe('bar');
  });
  it('parseSettings round-trips JSON, including day-keyed records', () => {
    const s = { ...DEFAULT_SETTINGS, exceptions: { 20000: 'zdravlje' as const }, nafilaDays: { 20001: true as const } };
    expect(parseSettings(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('parseSettings rejects invalid values', () => {
    expect(() => parseSettings({ city: 'beograd' })).toThrow();
    expect(() => parseSettings({ ifPlan: 18 })).toThrow();
    expect(() => parseSettings({ allergies: ['prasina'] })).toThrow();
    expect(() => parseSettings({ exceptions: { abc: 'drugo' } })).toThrow();
  });
});
