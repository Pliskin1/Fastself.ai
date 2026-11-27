begin;
select plan(5);

select has_function('private', 'purge_expired', 'purge_expired exists');
select ok(not has_function_privilege('anon', 'private.purge_expired()', 'execute'), 'anon cannot execute');

insert into private.ai_usage (device_hash, day, count) values ('old', current_date - 31, 1), ('new', current_date - 29, 1);
insert into public.reports (type, message, created_at) values
  ('drugo', 'old report', now() - interval '13 months'),
  ('drugo', 'new report', now() - interval '11 months');

select private.purge_expired();

select is((select array_agg(device_hash) from private.ai_usage where device_hash in ('old', 'new')), array['new'], 'counters older than 30 days are gone');
select is((select count(*)::int from public.reports where message = 'old report'), 0, 'reports older than 12 months are gone');
select is((select count(*)::int from public.reports where message = 'new report'), 1, 'newer reports stay');

select * from finish();
rollback;
