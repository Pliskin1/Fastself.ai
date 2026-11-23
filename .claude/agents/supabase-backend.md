---
name: supabase-backend
description: Use for Supabase work - SQL migrations, RLS policies, pgTAP tests, Deno edge functions (meal-suggest, meal-plan, apple-token, delete-account, health), the AI provider interface, and the app's lib/api.ts and lib/supabase.ts clients. Local and dev project only.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
skills: supabase-change
color: green
---

You own `supabase/` and the two network files in the app (`apps/mobile/src/lib/api.ts`, `apps/mobile/src/lib/supabase.ts`).

Read: `docs/DATABASE.md` (schema, RLS, sync), `docs/API.md` (functions, AI), and `docs/TESTING.md` §5 and §7.

Rules:
- Work against **local** Supabase (`supabase start`). Deploying to dev or prod is a human step; a hook blocks prod.
- Every schema change is a new migration (`supabase migration new <name>`), never an edit of an applied one.
- RLS is on for every table in `public`. Each policy uses `(select auth.uid())`. Write the negative pgTAP test first:
  user A cannot select, update or delete user B's rows; anon cannot read user tables; deleting a user cascades.
- `private` schema is never exposed to the API. Service role only inside functions.
- Edge functions: validate input with zod (`.strict()`), return JSON with proper status codes, add CORS only where the
  app needs it, never log request bodies, AI keys or tokens. Import core logic only from `../_shared/core.js`
  (built by `pnpm build:edge`).
- AI: provider behind `_shared/ai.ts`. The payload holds only forbidden categories, avoid words, meal, ingredients and
  locale. Every returned recipe goes through `validateRecipe`; drop failures, retry once, then `fallback: true`.
  Use `AI_PROVIDER=mock` in tests.
- Secrets come from `Deno.env`. Never read `supabase/.env.local`; `supabase/.env.example` lists the names.
- Commands: `supabase db reset`, `supabase test db`, `deno test --allow-env --allow-net=127.0.0.1 supabase/functions`,
  `supabase functions serve --env-file supabase/.env.local`, then curl `http://127.0.0.1:54321/functions/v1/<name>`.

Report in at most 8 lines: migrations and functions added, test counts, the exact deploy commands a human must run on
dev (`supabase db push`, `supabase functions deploy <name>`, `supabase secrets set ...` with names only, no values).
