-- Retention promised in docs/legal/privacy.md: AI usage counters 30 days, error reports 12 months.
-- One function, service role only. A daily pg_cron job runs it where the extension is available.
create or replace function private.purge_expired()
returns void language sql security definer set search_path = '' as $$
  delete from private.ai_usage where day < current_date - 30;
  delete from public.reports where created_at < now() - interval '12 months';
$$;

revoke execute on function private.purge_expired() from public, anon, authenticated;
grant execute on function private.purge_expired() to service_role;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('purge-expired', '17 3 * * *', 'select private.purge_expired()');
  else
    -- Without a schedule the retention in docs/legal/privacy.md is not kept. Enable pg_cron, or call purge_expired() daily.
    raise warning 'pg_cron is not available: purge_expired() is not scheduled';
  end if;
end $$;
