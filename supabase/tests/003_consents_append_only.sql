begin;
select plan(9);

insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','authenticated','authenticated','a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','authenticated','authenticated','b@test.local');
insert into public.consents (user_id, kind, granted, policy_version) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','ai',true,'1');
select is((select count(*) from public.consents where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 1::bigint, 'owner: B consent exists');

set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok($q$insert into public.consents (user_id, kind, granted, policy_version) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','sync_history',true,'1')$q$, 'A inserts own consent');
select is((select count(*) from public.consents where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1::bigint, 'A reads own consent');
select throws_ok($q$update public.consents set granted = false where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$q$, '42501', null, 'A cannot update consents');
select throws_ok($q$delete from public.consents where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$q$, '42501', null, 'A cannot remove consents');
select is((select count(*) from public.consents where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0::bigint, 'A cannot read B consents');
select throws_ok($q$insert into public.consents (user_id, kind, granted, policy_version) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','ai',false,'1')$q$, '42501', null, 'A cannot insert a consent for B');
select throws_ok($q$insert into public.consents (user_id, kind, granted, policy_version) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bogus',true,'1')$q$, '23514', null, 'bad consent kind fails the check');

reset role;
select is((select count(*) from public.consents where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and granted = true and kind = 'sync_history'), 1::bigint, 'owner: A consent unchanged');

select * from finish();
rollback;
