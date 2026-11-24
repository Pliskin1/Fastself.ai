begin;
select plan(40);

-- tables
select has_table('public', t, 'public.' || t || ' exists')
  from unnest(array['profiles','user_practices','user_allergies','consents','fasting_sessions','day_marks','meal_plans','reports','rule_packs']) as t;
select has_table('private', t, 'private.' || t || ' exists')
  from unnest(array['apple_tokens','ai_usage']) as t;

select is((select count(*) from pg_tables where schemaname = 'public'), 9::bigint, 'exactly 9 tables in public');

-- RLS on every table in public and private (a future table without RLS fails here)
select is_empty(
  $q$select n.nspname || '.' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public','private') and c.relkind in ('r','p') and not c.relrowsecurity$q$,
  'RLS is enabled on every table in public and private');

-- policies
select policies_are('public', 'profiles', array['own profile']);
select policies_are('public', 'user_practices', array['own rows']);
select policies_are('public', 'user_allergies', array['own rows']);
select policies_are('public', 'fasting_sessions', array['own rows']);
select policies_are('public', 'day_marks', array['own rows']);
select policies_are('public', 'meal_plans', array['own rows']);
select policies_are('public', 'consents', array['insert own consent','read own consent']);
select policies_are('public', 'reports', array['insert report']);
select policies_are('public', 'rule_packs', array['read rule packs']);

-- updated_at triggers
select has_trigger('public', t, 'touch_updated_at', t || ' has touch_updated_at')
  from unnest(array['profiles','user_practices','user_allergies','fasting_sessions','day_marks','meal_plans']) as t;

-- sync indexes
select has_index('public', t, t || '_user_id_updated_at_idx', array['user_id','updated_at']::name[], t || ' has (user_id, updated_at) index')
  from unnest(array['user_practices','user_allergies','fasting_sessions','day_marks','meal_plans']) as t;
select has_index('public', 'consents', 'consents_user_id_created_at_idx', array['user_id','created_at']::name[], 'consents has (user_id, created_at) index');

-- updated_at really changes on update
insert into auth.users (id, aud, role, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','authenticated','authenticated','a@test.local');
insert into public.user_practices (id, user_id, practice, updated_at)
  values ('aaaaaaaa-0000-0000-0000-000000000010','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','orthodox','2000-01-01');
update public.user_practices set active = false where id = 'aaaaaaaa-0000-0000-0000-000000000010';
select ok((select updated_at > '2000-01-01' from public.user_practices where id = 'aaaaaaaa-0000-0000-0000-000000000010'),
  'updated_at changes on update');

-- real signups insert into auth.users as supabase_auth_admin, which has no rights on public.profiles:
-- the profile trigger works for it only while the function is security definer
select has_trigger('auth', 'users', 'on_auth_user_created', 'auth.users has the profile trigger');
select is_definer('public'::name, 'handle_new_user'::name, 'handle_new_user is security definer'::text);

-- rule packs
select is((select count(*) from public.rule_packs where id in ('orthodox','islamic')), 2::bigint, 'both rule packs are seeded');
select ok((select data->>'id' = id and data->>'version' = version from public.rule_packs where id = 'orthodox'), 'orthodox pack id and version match its data');
select ok((select data->>'id' = id and data->>'version' = version from public.rule_packs where id = 'islamic'), 'islamic pack id and version match its data');

select * from finish();
rollback;
