import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { RemoteError, afterMarkFilter, createSupabaseRemote, remoteError } from '../remote';

const U = '3f0c9a52-7d1e-4b6a-8c2f-1e5d7a9b0c43';
const MARK = { ts: '2026-11-26T09:00:00.123456+00:00', id: '0b1e8f5a-3c2d-4e6f-8a9b-1c2d3e4f5a6b' };

interface Answer {
  data: unknown;
  error: { code?: string; message?: string } | null;
  status: number;
}

/** A client whose query builder records every method call and answers with `answer` (or throws it). */
function mockClient(answer: Answer | Error) {
  const calls: unknown[][] = [];
  const builder: object = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'then') {
          return (resolve: (value: Answer) => unknown, reject: (reason: unknown) => unknown) =>
            (answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer)).then(resolve, reject);
        }
        return (...args: unknown[]) => {
          calls.push([prop, ...args]);
          return builder;
        };
      },
    },
  );
  const client = {
    from: (table: string) => {
      calls.push(['from', table]);
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const ok = (data: unknown): Answer => ({ data, error: null, status: 200 });

describe('createSupabaseRemote', () => {
  it('pulls the first page of the user ordered by (updated_at, id)', async () => {
    const rows = [{ id: 'a', updated_at: MARK.ts, kind: 'if' }];
    const { client, calls } = mockClient(ok(rows));
    await expect(createSupabaseRemote(client, U).pull('fasting_sessions', null, 500)).resolves.toEqual(rows);
    expect(calls).toEqual([
      ['from', 'fasting_sessions'],
      ['select', '*'],
      ['eq', 'user_id', U],
      ['order', 'updated_at', { ascending: true }],
      ['order', 'id', { ascending: true }],
      ['limit', 500],
    ]);
  });

  it('pulls after a mark with the keyset filter, the timestamp kept verbatim', async () => {
    const { client, calls } = mockClient(ok([]));
    await createSupabaseRemote(client, U).pull('day_marks', MARK, 500);
    expect(calls).toContainEqual(['or', `updated_at.gt."${MARK.ts}",and(updated_at.eq."${MARK.ts}",id.gt.${MARK.id})`]);
    expect(afterMarkFilter(MARK)).toBe(calls.find((call) => call[0] === 'or')?.[1]);
  });

  it('upserts by id and returns the server stamps', async () => {
    const rows = [{ id: 'a', user_id: U, kind: 'custom', code: 'kivi', deleted: false }];
    const { client, calls } = mockClient(ok([{ id: 'a', updated_at: MARK.ts }]));
    await expect(createSupabaseRemote(client, U).upsert('user_allergies', rows)).resolves.toEqual([
      { id: 'a', updated_at: MARK.ts },
    ]);
    expect(calls).toEqual([
      ['from', 'user_allergies'],
      ['upsert', rows, { onConflict: 'id' }],
      ['select', 'id, updated_at'],
    ]);
  });

  it('reads and updates the profile row of the user', async () => {
    const profile = { city: 'bar', prayer_method: 'izcg', offsets: { fajr: 0, maghrib: 0 }, ramadan_shift: 0 };
    const read = mockClient(ok({ ...profile, updated_at: MARK.ts }));
    await expect(createSupabaseRemote(read.client, U).getProfile()).resolves.toEqual({
      ...profile,
      updated_at: MARK.ts,
    });
    expect(read.calls).toEqual([
      ['from', 'profiles'],
      ['select', 'city, prayer_method, offsets, ramadan_shift, updated_at'],
      ['eq', 'id', U],
      ['maybeSingle'],
    ]);

    const none = mockClient(ok(null));
    await expect(createSupabaseRemote(none.client, U).getProfile()).resolves.toBeNull();

    const write = mockClient(ok({ updated_at: MARK.ts }));
    await expect(createSupabaseRemote(write.client, U).updateProfile(profile)).resolves.toBe(MARK.ts);
    expect(write.calls).toEqual([
      ['from', 'profiles'],
      ['update', profile],
      ['eq', 'id', U],
      ['select', 'updated_at'],
      ['single'],
    ]);
  });

  it("deletes the user's rows of a table", async () => {
    const { client, calls } = mockClient(ok(null));
    await createSupabaseRemote(client, U).deleteRows('meal_plans');
    expect(calls).toEqual([['from', 'meal_plans'], ['delete'], ['eq', 'user_id', U]]);
  });

  it.each([
    [{ data: null, error: { code: '', message: 'TypeError: Network request failed' }, status: 0 }, 'offline'],
    [{ data: null, error: { code: '23514', message: 'check' }, status: 400 }, 'refused'],
    [{ data: null, error: { code: '23505', message: 'duplicate' }, status: 409 }, 'refused'],
    [{ data: null, error: { code: '22007', message: 'invalid date' }, status: 400 }, 'refused'],
    // No signed-in user (a sign-out during a run): the anon role is denied the table. That says nothing about the row.
    [{ data: null, error: { code: '42501', message: 'permission denied for table day_marks' }, status: 401 }, 'server'],
    [{ data: null, error: { code: '42501', message: 'row-level security' }, status: 403 }, 'refused'],
    [{ data: null, error: { code: 'PGRST204', message: 'no column' }, status: 400 }, 'server'],
    [{ data: null, error: { code: '', message: 'bad gateway' }, status: 502 }, 'server'],
  ] as [Answer, string][])('maps an error answer to %#: %s', async (answer, kind) => {
    const { client } = mockClient(answer);
    await expect(createSupabaseRemote(client, U).upsert('day_marks', [])).rejects.toMatchObject({ kind });
  });

  it('maps a thrown request to offline and rows without a stamp to server', async () => {
    const thrown = mockClient(new TypeError('Network request failed'));
    await expect(createSupabaseRemote(thrown.client, U).pull('day_marks', null, 1)).rejects.toMatchObject({
      kind: 'offline',
    });
    const bad = mockClient(ok([{ id: 'a' }]));
    await expect(createSupabaseRemote(bad.client, U).pull('day_marks', null, 1)).rejects.toBeInstanceOf(RemoteError);
    expect(remoteError(null, 0).kind).toBe('offline');
  });
});

describe('the keyset filter on the real supabase-js client', () => {
  it('reaches PostgREST as one or=(...) parameter with the + of the timestamp encoded', async () => {
    const fetch = jest.fn<Promise<Response>, [string | URL | Request, RequestInit?]>(
      async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const client = createClient('http://127.0.0.1:54321', 'anon-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch },
    });
    await createSupabaseRemote(client, U).pull('user_allergies', MARK, 500);

    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(url.pathname).toBe('/rest/v1/user_allergies');
    expect(url.searchParams.get('or')).toBe(`(${afterMarkFilter(MARK)})`);
    expect(url.searchParams.get('user_id')).toBe(`eq.${U}`);
    expect(url.searchParams.get('order')).toBe('updated_at.asc,id.asc');
    expect(url.searchParams.get('limit')).toBe('500');
    expect(url.search).toContain('%2B00%3A00'); // a raw + would reach the server as a space
  });
});
