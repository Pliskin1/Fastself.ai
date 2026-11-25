// Admin client for edge functions only. It bypasses RLS: never import it from anything the app bundles,
// never return its results unfiltered. Keys come from the env that Supabase injects into every function.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@^2';

let cached: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('admin client is not configured');
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
