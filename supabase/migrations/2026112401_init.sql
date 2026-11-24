-- fastself.ai initial schema, RLS and grants. Contract: docs/DATABASE.md sections 2 and 3.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  city text, prayer_method text default 'izcg', offsets jsonb default '{"fajr":0,"maghrib":0}',
  ramadan_shift int default 0 check (ramadan_shift between -1 and 1), locale text default 'sr-Latn',
  updated_at timestamptz not null default now());

create table public.user_practices (
  id uuid primary key, user_id uuid not null references public.profiles(id) on delete cascade,
  practice text not null check (practice in ('orthodox','ramadan','nafila','if')),
  settings jsonb not null default '{}',        -- {ifPlan, strictness, slavaId}
  active boolean not null default true, deleted boolean not null default false,
  updated_at timestamptz not null default now());

create table public.user_allergies (
  id uuid primary key, user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('allergen','custom','diet')), code text not null check (char_length(code) <= 40),
  deleted boolean not null default false, updated_at timestamptz not null default now());

create table public.consents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('sync_practices','sync_allergies','sync_history','ai')),
  granted boolean not null, policy_version text not null, created_at timestamptz not null default now());

create table public.fasting_sessions (
  id uuid primary key, user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null, ended_at timestamptz, target_hours int not null check (target_hours in (12,14,16)),
  kind text not null default 'if' check (kind in ('if','nafila')), deleted boolean not null default false,
  updated_at timestamptz not null default now());

create table public.day_marks (
  id uuid primary key, user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null, kind text not null check (kind in ('exception','nafila','kaza_done')),
  deleted boolean not null default false, updated_at timestamptz not null default now(), unique (user_id, day, kind));

create table public.meal_plans (
  id uuid primary key, user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null, rule_pack_version text not null, days jsonb not null,
  deleted boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.reports (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('pravilo','vrijeme','recept','drugo')), day date,
  context text check (char_length(context) <= 200), message text not null check (char_length(message) between 3 and 1000),
  rule_pack_version text, app_version text, status text not null default 'novo', created_at timestamptz not null default now());

create table public.rule_packs (
  id text primary key, version text not null, data jsonb not null, published_at timestamptz not null default now());

create schema if not exists private;
create table private.apple_tokens (user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null, created_at timestamptz not null default now());
create table private.ai_usage (device_hash text not null, day date not null, count int not null default 0,
  primary key (device_hash, day));

-- ---------------------------------------------------------------- indexes (delta sync)
create index user_practices_user_id_updated_at_idx on public.user_practices (user_id, updated_at);
create index user_allergies_user_id_updated_at_idx on public.user_allergies (user_id, updated_at);
create index fasting_sessions_user_id_updated_at_idx on public.fasting_sessions (user_id, updated_at);
create index day_marks_user_id_updated_at_idx on public.day_marks (user_id, updated_at);
create index meal_plans_user_id_updated_at_idx on public.meal_plans (user_id, updated_at);
create index consents_user_id_created_at_idx on public.consents (user_id, created_at);

-- ---------------------------------------------------------------- functions and triggers
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.user_practices for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.user_allergies for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.fasting_sessions for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.day_marks for each row execute function public.touch_updated_at();
create trigger touch_updated_at before update on public.meal_plans for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles (id) values (new.id) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.user_practices enable row level security;
alter table public.user_allergies enable row level security;
alter table public.consents enable row level security;
alter table public.fasting_sessions enable row level security;
alter table public.day_marks enable row level security;
alter table public.meal_plans enable row level security;
alter table public.reports enable row level security;
alter table public.rule_packs enable row level security;
alter table private.apple_tokens enable row level security;  -- no policies: only the service role bypasses
alter table private.ai_usage enable row level security;      -- no policies: only the service role bypasses

create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own rows" on public.user_practices for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.user_allergies for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.fasting_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.day_marks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.meal_plans for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- consents: insert + select own, no update/delete (history is kept)
create policy "insert own consent" on public.consents for insert to authenticated with check (user_id = (select auth.uid()));
create policy "read own consent" on public.consents for select to authenticated using (user_id = (select auth.uid()));

-- reports: anyone may insert; nobody reads via API (team reads in dashboard)
create policy "insert report" on public.reports for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- rule_packs: read for everyone, no writes via API
create policy "read rule packs" on public.rule_packs for select to anon, authenticated using (true);

-- ---------------------------------------------------------------- grants (explicit, minimum needed)
revoke all on all tables in schema public from anon, authenticated;
revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

grant select, insert, update, delete on public.profiles, public.user_practices, public.user_allergies,
  public.fasting_sessions, public.day_marks, public.meal_plans to authenticated;
grant select, insert on public.consents to authenticated;
grant insert on public.reports to anon, authenticated;
grant select on public.rule_packs to anon, authenticated;

grant all on all tables in schema public to service_role;
grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;
