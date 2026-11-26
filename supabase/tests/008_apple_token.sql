begin;
select plan(11);

insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','authenticated','authenticated','a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','authenticated','authenticated','b@test.local');

select has_function('public', 'save_apple_token', array['uuid', 'text'], 'save_apple_token exists');

-- Callers without the admin role cannot execute it.
select ok(not has_function_privilege('anon', 'public.save_apple_token(uuid,text)', 'execute'), 'anon cannot execute');
select ok(not has_function_privilege('authenticated', 'public.save_apple_token(uuid,text)', 'execute'), 'authenticated cannot execute');
select ok(has_function_privilege('service_role', 'public.save_apple_token(uuid,text)', 'execute'), 'the admin role can execute');

set local role anon;
select throws_ok($q$select public.save_apple_token('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x')$q$, '42501', null, 'anon call is refused');
set local role authenticated;
select throws_ok($q$select public.save_apple_token('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x')$q$, '42501', null, 'authenticated call is refused');

set local role service_role;
select is(public.save_apple_token('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'first'), true, 'first save stores the token');
select is(public.save_apple_token('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'second'), true, 'second save replaces it');
select is(public.save_apple_token('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ''), false, 'an empty token is rejected');
select is(public.save_apple_token(null, 'x'), false, 'a null user is rejected');
reset role;

select is(
  (select array_agg(refresh_token) from private.apple_tokens where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  array['second'],
  'one row holds the latest token (cascade on user delete is covered by 005)'
);

select * from finish();
rollback;
