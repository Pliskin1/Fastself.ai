begin;
select plan(8);

set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($q$select * from private.apple_tokens$q$, '42501', null, 'anon cannot select private.apple_tokens');
select throws_ok($q$insert into private.apple_tokens (user_id, refresh_token) values (gen_random_uuid(), 'x')$q$, '42501', null, 'anon cannot insert private.apple_tokens');
select throws_ok($q$select * from private.ai_usage$q$, '42501', null, 'anon cannot select private.ai_usage');
select throws_ok($q$insert into private.ai_usage (device_hash, day) values ('h', current_date)$q$, '42501', null, 'anon cannot insert private.ai_usage');

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
select throws_ok($q$select * from private.apple_tokens$q$, '42501', null, 'authenticated cannot select private.apple_tokens');
select throws_ok($q$insert into private.apple_tokens (user_id, refresh_token) values (gen_random_uuid(), 'x')$q$, '42501', null, 'authenticated cannot insert private.apple_tokens');
select throws_ok($q$select * from private.ai_usage$q$, '42501', null, 'authenticated cannot select private.ai_usage');
select throws_ok($q$insert into private.ai_usage (device_hash, day) values ('h', current_date)$q$, '42501', null, 'authenticated cannot insert private.ai_usage');

select * from finish();
rollback;
