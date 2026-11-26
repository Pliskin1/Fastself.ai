-- Stores the Sign in with Apple refresh token (needed to revoke it on account deletion, T19).
-- private.apple_tokens stays unreachable through the API; only the edge functions' admin role may call this.
create or replace function public.save_apple_token(p_user_id uuid, p_refresh_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or p_refresh_token is null or pg_catalog.length(p_refresh_token) = 0 then
    return false;
  end if;
  insert into private.apple_tokens as t (user_id, refresh_token)
  values (p_user_id, p_refresh_token)
  on conflict (user_id) do update set refresh_token = excluded.refresh_token, created_at = pg_catalog.now();
  return true;
end;
$$;

revoke execute on function public.save_apple_token(uuid, text) from public, anon, authenticated;
grant execute on function public.save_apple_token(uuid, text) to service_role;
