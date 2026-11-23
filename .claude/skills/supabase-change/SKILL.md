---
name: supabase-change
description: Use for any change to the Supabase schema, RLS policies, seeds, pgTAP tests or edge functions of fastself.ai. Gives the safe order of steps from local to dev.
argument-hint: "[what changes, e.g. add column meal_plans.notes]"
---

# Supabase change: $ARGUMENTS

Order matters. Never skip the test step, never touch prod.

1. **Plan**: which tables, policies and functions change, and which client code reads them (`apps/mobile/src/lib`,
   `apps/mobile/src/sync`). Check `docs/DATABASE.md` and update it in the same change.
2. **Migration**: `supabase migration new <snake_name>`. Write SQL that is safe to run once on a database that already
   has data: `add column ... default ...`, no destructive drops without a human decision.
3. **RLS**: every new table gets `enable row level security` and policies using `(select auth.uid()) = user_id`.
   User tables reference `public.profiles(id) on delete cascade`.
4. **Tests first** in `supabase/tests/NNN_<name>.sql` (pgTAP): `plan(n)`, positive and negative cases with
   `set local role authenticated` and `set local request.jwt.claims to '{"sub":"<uuid>"}'`, then `finish()`.
5. **Run**: `supabase db reset` then `supabase test db`. Fix until green.
6. **Types**: `supabase gen types typescript --local > apps/mobile/src/lib/database.types.ts`.
7. **Functions** (if touched): `deno test --allow-env --allow-net=127.0.0.1 supabase/functions`, then
   `supabase functions serve --env-file supabase/.env.local` and curl it once with a valid and an invalid body.
8. **Client**: update `lib/api.ts` or the sync mapping and its Jest test.
9. **Hand-off**: print the commands a human runs on **dev** after merge:
   ```
   supabase link --project-ref <dev-ref>
   supabase db push
   supabase functions deploy <name>
   supabase secrets set NAME=...   # names only
   ```
   Prod gets the same commands on release day, run by A, after the dev check.
