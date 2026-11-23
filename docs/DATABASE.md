# Data: SQLite on the phone, Postgres on the server, sync

Principle: everything lives on the phone first. The server receives only what the user consented to sync, and only with
an account. Each user sees only their own rows (RLS). Deleting the account removes everything (cascade).

## 1. SQLite (apps/mobile/src/db): expo-sqlite, WAL, migrations via `PRAGMA user_version`
```sql
-- v1
CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
-- keys: settings (JSON of Settings without allergies/exceptions), onboarded, install_id (uuid v4, random),
--       consent_ai, consent_sync_practices, consent_sync_allergies, consent_sync_history, last_sync_at, auth_user_id
CREATE TABLE practices (id TEXT PRIMARY KEY, practice TEXT NOT NULL CHECK (practice IN ('orthodox','ramadan','nafila','if')),
  active INTEGER NOT NULL, settings TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE TABLE allergies (id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('allergen','custom','diet')),
  code TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, UNIQUE(kind, code));
CREATE TABLE fasting_sessions (id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, ended_at INTEGER,
  target_hours INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'if', updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE TABLE day_marks (id TEXT PRIMARY KEY, day TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('exception','nafila','kaza_done')),
  reason TEXT,                -- LOCAL ONLY, never synced
  updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, UNIQUE(day, kind));
CREATE TABLE safety (key TEXT PRIMARY KEY CHECK (key IN ('preg','diab','ed','minor')), value INTEGER NOT NULL);  -- LOCAL ONLY
CREATE TABLE meal_plans (id TEXT PRIMARY KEY, week_start TEXT NOT NULL, rule_pack_version TEXT NOT NULL,
  days TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
CREATE TABLE shopping_checks (item TEXT PRIMARY KEY, checked INTEGER NOT NULL);   -- local only
CREATE TABLE outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, tbl TEXT NOT NULL, row_id TEXT NOT NULL, op TEXT NOT NULL
  CHECK (op IN ('upsert','delete')), created_at INTEGER NOT NULL);
```
- ids are uuid v4 generated on the device (`expo-crypto randomUUID`). Times are epoch ms. Days are `YYYY-MM-DD`.
- Every write to a syncable table (practices, allergies, fasting_sessions, day_marks, meal_plans) also inserts into
  `outbox` **only if** the matching consent is on and a user is signed in.
- The repository layer sits behind an interface (`Db`) so jest can run it on an in-memory adapter.
- "Obriši podatke sa telefona" drops all tables, re-runs the migrations and keeps only `install_id`.

## 2. Postgres schema (supabase/migrations/2026112401_init.sql)
```sql
create extension if not exists pgcrypto;

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
revoke all on schema private from anon, authenticated;

-- updated_at trigger on every public table that has updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
-- (create trigger … before update … for each row execute function public.touch_updated_at(); for each table)

-- profile row on signup
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id) values (new.id) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
```

## 3. RLS (same migration)
```sql
alter table public.profiles enable row level security;
-- repeat enable for every public table
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- for user_practices, user_allergies, fasting_sessions, day_marks, meal_plans:
create policy "own rows" on public.user_practices for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- consents: insert + select own, no update/delete (history is kept)
create policy "insert own consent" on public.consents for insert to authenticated with check (user_id = (select auth.uid()));
create policy "read own consent" on public.consents for select to authenticated using (user_id = (select auth.uid()));
-- reports: anyone may insert; nobody reads via API (team reads in dashboard)
create policy "insert report" on public.reports for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
-- rule_packs: read for everyone, no writes via API
create policy "read rule packs" on public.rule_packs for select to anon, authenticated using (true);
```
Indexes: `(user_id, updated_at)` on every synced table.

## 4. Sync protocol (apps/mobile/src/sync)
- **When:** on sign-in (full pull, then push), on app foreground (push outbox, then pull since `last_sync_at`), and
  debounced 5 s after local writes.
- **Push:** read the outbox in order and group by table. Upsert rows (with `deleted`) via supabase-js
  `.upsert(rows, { onConflict: 'id' })`, then delete outbox entries on success. Rows from a table whose consent is off are
  never pushed (they are filtered at enqueue time and again at push time).
- **Pull:** for each consented table, `select * where updated_at > last_sync_at` and merge with last-write-wins
  (`updated_at` epoch). Remote deletes set local `deleted = 1`.
- **Profile:** city, prayer method, offsets and ramadanShift sync with the practices consent.
  Settings like reminders stay local.
- **Turning a consent off** stops sync for that table and asks: "Obrisati i kopiju na serveru?" Yes deletes those server rows.
- **Conflicts** are rare (one user, few devices); LWW is acceptable and documented in DECISIONS.

## 5. Notifications plan (core `notifications/plan.ts`, app `src/notifications`)
`planNotifications(today, settings, now) → Array<{ id, at: epochMs, title, body }>`, up to 60, next 7 days:
- `remVece`: at 20:00 the day before any day where `dayPlan.orthFast` or a nafila suggestion applies (if nafila is on).
  Text from COPY `notif.evening.*` names the level.
- `remRam` (Ramadan days): sehur at fajr − 30 min, iftar at maghrib.
- `remWindow`: IF window open at window start and closing 30 min before the end (only if IF is on).
- `remIf`: scheduled by the timer at start + plan (not by the planner).
The app cancels all planner notifications (identifier prefix `plan:`) and re-adds them on foreground, on settings change and
after midnight. iOS keeps at most 64 pending; the planner caps at 60 and leaves room for the timer.

## 6. Export (`row-export`)
JSON file `fastself-izvoz-YYYY-MM-DD.json`:
`{ app, version, exported_at, settings, practices, allergies, fasting_sessions, day_marks, meal_plans }`.
Safety answers and exception reasons are included because the export is the user's own copy, and the file is shared
only by the user via the share sheet.
