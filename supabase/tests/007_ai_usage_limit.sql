begin;
select plan(11);

select has_function('public', 'bump_ai_usage', array['text', 'integer', 'integer'], 'bump_ai_usage exists');

-- Callers without the admin role cannot execute it.
select ok(not has_function_privilege('anon', 'public.bump_ai_usage(text,integer,integer)', 'execute'), 'anon cannot execute');
select ok(not has_function_privilege('authenticated', 'public.bump_ai_usage(text,integer,integer)', 'execute'), 'authenticated cannot execute');
select ok(has_function_privilege('service_role', 'public.bump_ai_usage(text,integer,integer)', 'execute'), 'the admin role can execute');

set local role anon;
select throws_ok($q$select public.bump_ai_usage('h-anon', 20, 1)$q$, '42501', null, 'anon call is refused');
set local role authenticated;
select throws_ok($q$select public.bump_ai_usage('h-auth', 20, 1)$q$, '42501', null, 'authenticated call is refused');

set local role service_role;
select is((select count(*)::int from generate_series(1, 20) g where public.bump_ai_usage('device-a', 20, 1)), 20, 'calls 1 to 20 are allowed');
select is(public.bump_ai_usage('device-a', 20, 1), false, 'the 21st call is not allowed');
select is(public.bump_ai_usage('device-b', 20, 1), true, 'a different device hash has its own counter');

-- Cost counts: 3 + 3 + 3 = 9 of 10, the next 3 does not fit, a cost of 1 still does.
select is((select count(*)::int from generate_series(1, 3) g where public.bump_ai_usage('device-c', 10, 3)), 3, 'cost 3 is added three times');
select is(
  array[public.bump_ai_usage('device-c', 10, 3), public.bump_ai_usage('device-c', 10, 1)],
  array[false, true],
  'a cost that does not fit is refused, a smaller one still fits'
);

select * from finish();
rollback;
