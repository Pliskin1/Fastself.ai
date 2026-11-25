import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The Supabase client (docs/API.md §8). With api.ts it is the only place that talks to the network (CLAUDE.md rule 2).

let client: SupabaseClient | null | undefined;

/**
 * The app's one Supabase client, made on first use. The session is kept in expo-sqlite's localStorage.
 * Null when the build has no project URL or anon key: the app then runs as a guest and api.ts answers 'server'.
 */
export function getSupabase(): SupabaseClient | null {
  if (client === undefined) {
    // Static dot access: Expo inlines only literal process.env.EXPO_PUBLIC_* reads.
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    client =
      url && anonKey
        ? createClient(url, anonKey, {
            auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
          })
        : null;
  }
  return client;
}
