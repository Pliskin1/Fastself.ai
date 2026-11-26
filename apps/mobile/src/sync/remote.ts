import type { SupabaseClient } from '@supabase/supabase-js';
import type { PullMark } from './state';
import type { ServerProfileValues, ServerTable } from './tables';

// The server side of the sync, behind one interface: the engine talks only to `SyncRemote`, the app builds it on the
// Supabase client (`createSupabaseRemote`) and the tests on a fake server. Every failure is a `RemoteError`.

export type RemoteErrorKind = 'offline' | 'server' | 'refused';

/**
 * `offline`: no answer (status 0 or a thrown fetch). `refused`: the server answered and will never take this payload
 * (bad data, Postgres `22xxx`; a constraint, `23xxx`; or row-level security, `42501`). `server`: any other failure.
 */
export class RemoteError extends Error {
  readonly kind: RemoteErrorKind;
  constructor(kind: RemoteErrorKind, message: string = kind) {
    super(message);
    this.name = 'RemoteError';
    this.kind = kind;
  }
}

/** A row as the server returns it: its columns plus `id` and the server's `updated_at`, kept as the exact string. */
export type ServerRow = Record<string, unknown> & { id: string; updated_at: string };
export type ServerProfile = Record<string, unknown> & { updated_at: string };
export interface Stamp {
  id: string;
  updated_at: string;
}

export interface SyncRemote {
  /** One page of the user's rows ordered by (`updated_at`, `id`), strictly after the mark. */
  pull(table: ServerTable, after: PullMark | null, limit: number): Promise<ServerRow[]>;
  /** Inserts or updates the rows by id and returns the `updated_at` the server gave each one. */
  upsert(table: ServerTable, rows: Record<string, unknown>[]): Promise<Stamp[]>;
  /** The user's `profiles` row, or null when there is none. */
  getProfile(): Promise<ServerProfile | null>;
  /** Writes the profile columns and returns the new `updated_at`. */
  updateProfile(values: ServerProfileValues): Promise<string>;
  /** Deletes every row of the user in the table. */
  deleteRows(table: ServerTable): Promise<void>;
}

/** Maps a PostgREST answer to the error kind. */
export function remoteError(error: { code?: string; message?: string } | null, status: number): RemoteError {
  if (status === 0) return new RemoteError('offline', error?.message);
  const code = error?.code ?? '';
  if (code.startsWith('22') || code.startsWith('23') || code === '42501') {
    return new RemoteError('refused', error?.message);
  }
  return new RemoteError('server', error?.message);
}

/**
 * The PostgREST `or` filter for "after the mark" in (`updated_at`, `id`) order. The timestamp is the server's own
 * string, quoted because it holds `.`, `:` and `+`.
 * Checked against local Supabase on 2026-11-26: PostgREST takes it, and pages of 2 over rows that share one
 * timestamp return every row once.
 */
export function afterMarkFilter(mark: PullMark): string {
  return `updated_at.gt."${mark.ts}",and(updated_at.eq."${mark.ts}",id.gt.${mark.id})`;
}

interface Answer {
  data: unknown;
  error: { code?: string; message?: string } | null;
  status: number;
}

/** Awaits a PostgREST call; a throw is a request that never got an answer. */
async function answer(request: PromiseLike<Answer>): Promise<unknown> {
  let result: Answer;
  try {
    result = await request;
  } catch (e) {
    throw new RemoteError('offline', e instanceof Error ? e.message : undefined);
  }
  if (result.error) throw remoteError(result.error, result.status);
  return result.data;
}

const isStampedRow = (value: unknown): value is ServerRow =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { id?: unknown }).id === 'string' &&
  typeof (value as { updated_at?: unknown }).updated_at === 'string';

function stampedRows(data: unknown): ServerRow[] {
  if (!Array.isArray(data) || !data.every(isStampedRow)) throw new RemoteError('server', 'unexpected rows');
  return data;
}

/** The remote on the app's Supabase client. Row-level security limits every call to the signed-in user. */
export function createSupabaseRemote(client: SupabaseClient, userId: string): SyncRemote {
  return {
    async pull(table, after, limit) {
      let query = client.from(table).select('*').eq('user_id', userId);
      if (after) query = query.or(afterMarkFilter(after));
      const data = await answer(
        query.order('updated_at', { ascending: true }).order('id', { ascending: true }).limit(limit),
      );
      return stampedRows(data);
    },

    async upsert(table, rows) {
      const data = await answer(client.from(table).upsert(rows, { onConflict: 'id' }).select('id, updated_at'));
      return stampedRows(data).map((row) => ({ id: row.id, updated_at: row.updated_at }));
    },

    async getProfile() {
      const data = await answer(
        client
          .from('profiles')
          .select('city, prayer_method, offsets, ramadan_shift, updated_at')
          .eq('id', userId)
          .maybeSingle(),
      );
      if (data === null) return null;
      if (typeof data !== 'object' || typeof (data as { updated_at?: unknown }).updated_at !== 'string') {
        throw new RemoteError('server', 'unexpected profile');
      }
      return data as ServerProfile;
    },

    async updateProfile(values) {
      const data = await answer(
        client
          .from('profiles')
          .update({ ...values })
          .eq('id', userId)
          .select('updated_at')
          .single(),
      );
      const stamp = (data as { updated_at?: unknown } | null)?.updated_at;
      if (typeof stamp !== 'string') throw new RemoteError('server', 'unexpected profile');
      return stamp;
    },

    async deleteRows(table) {
      await answer(client.from(table).delete().eq('user_id', userId));
    },
  };
}
