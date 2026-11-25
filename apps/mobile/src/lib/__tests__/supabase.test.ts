const mockCreateClient = jest.fn();
const mockStorage = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };

jest.mock('@supabase/supabase-js', () => ({ createClient: mockCreateClient }));
// The real module installs a localStorage backed by expo-sqlite, which needs the native module.
jest.mock('expo-sqlite/localStorage/install', () => {
  (globalThis as { localStorage?: unknown }).localStorage = mockStorage;
  return {};
});

// Changed in place and never swapped for a copy: Expo's Babel plugin reads EXPO_PUBLIC_* from the env object it took
// when the module loaded.
const ENV_KEYS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const ORIGINAL_ENV = ENV_KEYS.map((key) => process.env[key]);

/** Loads a fresh copy of the module, so each test starts with no client made yet. */
function load(): typeof import('../supabase') {
  let loaded: typeof import('../supabase') | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('../supabase') as typeof import('../supabase');
  });
  return loaded!;
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.test';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  mockCreateClient.mockReset();
  mockCreateClient.mockReturnValue({ client: true });
});

afterEach(() => {
  ENV_KEYS.forEach((key, index) => {
    const value = ORIGINAL_ENV[index];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
});

describe('getSupabase', () => {
  it('makes the client with the project URL, the anon key and a session kept in localStorage', () => {
    const { getSupabase } = load();
    expect(getSupabase()).toEqual({ client: true });
    expect(mockCreateClient).toHaveBeenCalledWith('https://example.supabase.test', 'anon-key', {
      auth: { storage: mockStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
  });

  it('makes nothing until it is first asked for, and then only once', () => {
    const { getSupabase } = load();
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(getSupabase()).toBe(getSupabase());
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });

  it.each(['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'])(
    'gives null, and does not throw, when %s is missing or empty',
    (name) => {
      delete process.env[name];
      expect(load().getSupabase()).toBeNull();
      process.env[name] = '';
      expect(load().getSupabase()).toBeNull();
      expect(mockCreateClient).not.toHaveBeenCalled();
    },
  );
});
