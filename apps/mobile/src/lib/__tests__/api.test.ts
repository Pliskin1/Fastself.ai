import { sendReport, type ReportInput } from '../api';

const INPUT: ReportInput = {
  type: 'pravilo',
  day: '2026-12-02',
  context: 'danas',
  message: 'Pogrešno pravilo',
  rule_pack_version: '0.1.0',
  app_version: '1.0.0',
};

const ORIGINAL_ENV = { ...process.env };
const fetchMock = jest.fn();

beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.test';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.useRealTimers();
});

describe('sendReport', () => {
  it('posts the row to /rest/v1/reports without asking for it back', async () => {
    fetchMock.mockResolvedValue({ status: 201 });
    expect(await sendReport(INPUT)).toEqual({ ok: true, data: null });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.supabase.test/rest/v1/reports');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      apikey: 'anon-key',
      Authorization: 'Bearer anon-key',
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    });
    expect(url).not.toContain('select');
    expect(Object.keys(JSON.parse(init.body as string) as object).sort()).toEqual(
      ['app_version', 'context', 'day', 'message', 'rule_pack_version', 'type'].sort(),
    );
  });

  it.each([
    [200, true],
    [204, true],
    [429, 'rate_limited'],
    [400, 'invalid'],
    [409, 'invalid'],
    [422, 'invalid'],
    [401, 'server'],
    [403, 'server'],
    [500, 'server'],
    [503, 'server'],
  ])('maps status %i', async (status, expected) => {
    fetchMock.mockResolvedValue({ status });
    const result = await sendReport(INPUT);
    if (expected === true) expect(result).toEqual({ ok: true, data: null });
    else expect(result).toEqual({ ok: false, error: expected });
  });

  it('gives offline when fetch throws', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    expect(await sendReport(INPUT)).toEqual({ ok: false, error: 'offline' });
  });

  it('gives offline when the request is aborted after the timeout', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const pending = sendReport(INPUT);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(await pending).toEqual({ ok: false, error: 'offline' });
  });

  it('gives server and does not call fetch when an env value is missing', async () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(await sendReport(INPUT)).toEqual({ ok: false, error: 'server' });
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.test';
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(await sendReport(INPUT)).toEqual({ ok: false, error: 'server' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
