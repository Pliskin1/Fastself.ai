-- Daily AI call counter per hashed device. Only the edge functions' admin role may call it.
-- private.ai_usage stays unreachable through the API; this function is the single door.
create or replace function public.bump_ai_usage(p_device_hash text, p_limit int, p_cost int default 1)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (pg_catalog.now() at time zone 'Europe/Podgorica')::date;
  v_count int;
begin
  if p_device_hash is null or pg_catalog.length(p_device_hash) = 0 or p_limit < 1 or p_cost < 1 or p_cost > p_limit then
    return false;
  end if;
  -- One atomic statement: insert the first call of the day, or add the cost only while it still fits.
  insert into private.ai_usage as u (device_hash, day, count)
  values (p_device_hash, v_day, p_cost)
  on conflict (device_hash, day) do update set count = u.count + p_cost
    where u.count + p_cost <= p_limit
  returning u.count into v_count;
  return v_count is not null;
end;
$$;

revoke execute on function public.bump_ai_usage(text, int, int) from public, anon, authenticated;
grant execute on function public.bump_ai_usage(text, int, int) to service_role;
