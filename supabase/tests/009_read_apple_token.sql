begin;
select plan(11);

insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','authenticated','authenticated','a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','authenticated','authenticated','b@test.local');
insert into private.apple_tokens (user_id, refresh_token) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tok-a');

select has_function('public', 'read_apple_token', array['uuid'], 'read_apple_token exists');
select function_returns('public', 'read_apple_token', array['uuid'], 'text', 'it returns text');

-- Callers without the admin role cannot execute it.
select ok(not has_function_privilege('anon', 'public.read_apple_token(uuid)', 'execute'), 'anon cannot execute');
select ok(not has_function_privilege('authenticated', 'public.read_apple_token(uuid)', 'execute'), 'authenticated cannot execute');
select ok(has_function_privilege('service_role', 'public.read_apple_token(uuid)', 'execute'), 'the admin role can execute');

set local role anon;
select throws_ok($q$select public.read_apple_token('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$q$, '42501', null, 'anon call is refused');
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
select throws_ok($q$select public.read_apple_token('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$q$, '42501', null, 'authenticated call is refused, even for the own id');

set local role service_role;
select is(public.read_apple_token('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'tok-a', 'returns the token of a user with a row');
select is(public.read_apple_token('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), null, 'null for a user without a row');
select is(public.read_apple_token(null), null, 'null for a null id');
reset role;

select is(
  (select array_agg(refresh_token) from private.apple_tokens
    where user_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')),
  array['tok-a'],
  'reading changes nothing'
);

select * from finish();
rollback;
