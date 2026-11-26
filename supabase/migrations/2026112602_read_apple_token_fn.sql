-- Reads the Sign in with Apple refresh token so delete-account can revoke it before the user is deleted (T19).
-- private.apple_tokens stays unreachable through the API; only the edge functions' admin role may call this.
create or replace function public.read_apple_token(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select t.refresh_token from private.apple_tokens as t where t.user_id = p_user_id;
$$;

revoke execute on function public.read_apple_token(uuid) from public, anon, authenticated;
grant execute on function public.read_apple_token(uuid) to service_role;
