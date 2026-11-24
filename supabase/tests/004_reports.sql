begin;
select plan(13);

insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','authenticated','authenticated','a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','authenticated','authenticated','b@test.local');

set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select lives_ok($q$insert into public.reports (type, message) values ('drugo','ok1')$q$, 'anon inserts a report with user_id null');
select throws_ok($q$insert into public.reports (user_id, type, message) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','drugo','no1')$q$, '42501', null, 'anon cannot insert a report as A');
select throws_ok($q$select * from public.reports$q$, '42501', null, 'anon cannot select reports');
select throws_ok($q$insert into public.reports (type, message) values ('drugo','xx')$q$, '23514', null, 'message of 2 chars fails');
select throws_ok($q$insert into public.reports (type, message) values ('drugo', repeat('x', 1001))$q$, '23514', null, 'message of 1001 chars fails');
select lives_ok($q$insert into public.reports (type, message) values ('drugo','ok2')$q$, 'message of 3 chars passes');
select lives_ok($q$insert into public.reports (type, message) values ('drugo','ok' || repeat('x', 998))$q$, 'message of 1000 chars passes');
select throws_ok($q$insert into public.reports (type, message, context) values ('drugo','no2', repeat('c', 201))$q$, '23514', null, 'context of 201 chars fails');
select throws_ok($q$insert into public.reports (type, message) values ('bogus','no3')$q$, '23514', null, 'bad type fails');

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
select lives_ok($q$insert into public.reports (user_id, type, message) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','drugo','ok3')$q$, 'A inserts a report with own id');
select throws_ok($q$insert into public.reports (user_id, type, message) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','drugo','no4')$q$, '42501', null, 'A cannot insert a report as B');
select throws_ok($q$select * from public.reports$q$, '42501', null, 'authenticated cannot select reports');

reset role;
select is((select count(*) from public.reports where message like 'ok%'), 4::bigint, 'owner: exactly the 4 valid reports exist');

select * from finish();
rollback;
