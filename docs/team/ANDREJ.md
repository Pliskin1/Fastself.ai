# Andrej: plan za 23.–27.11.

Ti praviš mozak i server aplikacije: pravila posta i sve računanje (core), lokalnu bazu i hookove iz kojih ekrani
čitaju podatke, Supabase bazu sa zaštitom (RLS), edge funkcije i AI, notifikacije, prijavu i sinhronizaciju, brisanje
naloga i izvoz podataka. Od ekrana praviš Plan tab i tri sheeta (prijava greške, brisanje naloga, spisak za kupovinu).
Na tebi su i spec dokument za mentore, pravne stranice i App Store Connect. Radiš na Windowsu, a sve provjeravaš na
svom Android telefonu, jer je to ista aplikacija iz istog koda. Danilo radi ostale ekrane i sve što traži Mac ili
iPhone. Posao je podijeljen na oko 33 h svakome (sa petkom). Radite istovremeno, svako u svojim folderima, i spajate se dva puta
dnevno. Neke tvoje stvari Danilo čeka (označene ⚡): njih spajaš čim su gotove.

## Tvoja sedmica
| Dan | Ti radiš | Spajaš do | Danilo ti daje |
|---|---|---|---|
| Pon | instalacija + nalozi (do 14:30), T2 core (14:30–18:30) | T2 do 20:00 (Danilo ga treba u utorak) | ⚡ T1 u 14:30, T3 komponente u 18:30 |
| Uto | T4 lokalna baza + hookovi (9–11), T9 baza + RLS (11–14), T10 funkcije + sheet prijave (14–17:30), deploy na dev | ⚡ T4 u 11:00, T9 + T10 u 18:00 | T5 rute u 10:15 |
| Sri | T15 notifikacije (9–11), T14 api + mock (11–12:30), T11 Plan + kupovina (13:30–16), T16 spec (16–17:30), pravne stranice (17:30–18) | ⚡ T15 u 11:00, ⚡ T14 api u 13:00, T11 u 18:00 | — |
| Čet | T17 auth backend (9–10:30), T18 sync (10:30–14), T19 brisanje + izvoz (14–16), prod backend (16–17) | ⚡ T17 u 10:30, T19 u 16:00, ⚡ javi Danilu "prod spreman" u 17:00 | T22 TestFlight veče |
| Pet | T24 audit (9–10), T23 Android + backend bugovi, T26 App Store Connect metapodaci, T27 submit sa Danilom | do 15:00 | screenshotovi |
**Spec dokument predaješ u četvrtak 26.11.** (gotov u srijedu u 17:30, Danilo ga pročita uveče).

## Zajednički ritam
- **09:00** dogovor 10 min: šta je spojeno, šta danas, šta blokira.
- **13:00 i 18:00** spajanje: pregledate PR-ove jedan drugom (5–10 min), merge, `git pull`. Ti pokreneš aplikaciju
  na Androidu (`pnpm android`) i provjeriš Danilove ekrane po listi iz `docs/PLATFORMS.md` §8. Danilo provjeri tvoje
  ekrane na iPhoneu. Greške upisujete u `docs/QA-LOG.md`.
- Poslije merge-a: `/clear` i novi zadatak u novoj grani.
- Ti ažuriraš samo A blok u `docs/PROGRESS.md`.

## Pravila da se ne sudarate
- Diraš samo svoje putanje (lista ispod). Ako ti treba izmjena kod Danila, Claude će napisati "ZAHTJEV ZA D: ...":
  pošalji mu to, ne mijenjaj sam.
- Pakete dodaješ samo za svoj dio i u posebnom malom PR-u. Ako `pnpm-lock.yaml` ima konflikt: uzmi verziju iz `main`,
  `pnpm install`, commit.
- Produkciju (prod Supabase, secrets, `eas submit`) pokrećeš ti ručno u terminalu, nikad Claude.

---

# For Claude Code (A sessions)

You are working with **Andrej (A)** on **Windows with an Android phone**. He runs `pnpm android` (phone over USB or an
emulator), never the iOS Simulator. Danilo (D) works in parallel on a Mac with an iPhone. Follow CLAUDE.md. This section
lists what A owns, what he must provide to D (exact signatures, D builds against them), what he consumes, and the
prompt for each task. The human pastes one prompt per session.

Windows notes: commands run in Git Bash; paths in code are POSIX; keep the repo at `C:\fastself`. Docker Desktop
must be running before `supabase start`. Local Supabase from the phone needs `adb reverse tcp:54321 tcp:54321`
(PLATFORMS.md §3).

## A owns (edit only these)
- `packages/core/**`, `supabase/**` (migrations, tests, functions, seed, config), `supabase/functions/_shared/core.js`
- `apps/mobile/src/lib/**` (api, api.mock, supabase, auth, export, location, clock, dev), `src/db/**`, `src/store/**`,
  `src/hooks/**`, `src/sync/**`, `src/notifications/**`, `src/test/**`
- UI: `src/app/(tabs)/plan.tsx`, `src/app/(sheets)/{prijava-greske,brisanje,kupovina}.tsx`, `src/features/plan/**`,
  `src/features/report/**`, `src/features/brisanje/**`, `src/features/dev/sections/notifications.tsx`
- `apps/mobile/src/copy/sr/{plan,report,brisanje,notif}.ts`
- `docs/SPEC.md`, `docs/legal/**`, `docs/store/metadata.md`, `docs/reference/sources/**`, A block of `docs/PROGRESS.md`
- `.github/workflows/keepalive.yml`, `.claude/prod-project-ref.txt`

## A provides to D (exact signatures; D codes against these)
| What | Signature | File | Merge by |
|---|---|---|---|
| core | `dayPlan(n: DayNum, s: Settings): DayPlan`, `rangeStats(start, days, s)`, `nextSlava(today, slavaId)`, `forbiddenFor(plan, s)`, `validateRecipe(recipe, forbidden, customAvoid): string[]`, `skyColors(alt, morning)`, `sunAltitude(n, minutes, lat, lng)`, `moonPhase(n)`, `pl(n, forms)`, `toDayNum(y, m, d)`, `fromDayNum(n)`, types `Settings`, `DayPlan`, `FoodLevel`, `Recipe`, `CityId` | `packages/core/src/index.ts` | Mon 20:00 |
| hooks | `useSettings(): Settings`; `useUpdateSettings(): (patch: Partial<Settings>) => void`; `useNow(): { now: SharedValue<number>; minute: number }` (epoch ms, dev-clock aware; `minute` changes once a minute); `useToday(): DayNum`; `useDayPlan(n?: DayNum): DayPlan`; `useRange(start: DayNum, days: 7 \| 30): { plans: DayPlan[]; stats: RangeStats }` | `src/hooks/index.ts` | ⚡ Tue 11:00 |
| repos | `fastingSessions.start(planH) / stop() / current() / last7()`; `dayMarks.setException(n, reason) / clear(n) / list(from, to)`; `consents.set(kind: 'ai'\|'practices'\|'allergies'\|'history', on: boolean) / get(kind)` | `src/db/repo/*.ts` | ⚡ Tue 11:00 |
| test utils | `withProviders(el, { settings?, now? })`, `fixtureSettings(patch?)`, `at(isoLocal)` | `src/test/utils.tsx` (alias `@/test/utils`) | ⚡ Tue 11:00 |
| dev tools | `applyDevLink(url: string): Promise<void>` (reset, preset, date, time, tab per SCREENS.md §0), `setDevClock(isoLocal \| null)` | `src/lib/dev.ts`, `src/lib/clock.ts` | ⚡ Tue 11:00 |
| permissions | `ensureNotificationPermission(): Promise<boolean>` (creates the Android channel `podsjetnici` first); `nearestCity(): Promise<CityId \| null>` (coarse location, coordinates discarded) | `src/notifications/permissions.ts`, `src/lib/location.ts` | ⚡ Tue 11:00 |
| notifications | `scheduleIfEnd(endsAtMs: number)`, `cancelIfEnd()`, `rescheduleAll()`, `sendTestNotification()`, `listScheduled()` | `src/notifications/index.ts` | ⚡ Wed 11:00 |
| api | `suggestMeals`, `mealPlan`, `sendReport`, `deleteAccount` returning `{ ok: true, data } \| { ok: false, error: 'offline'\|'rate_limited'\|'server'\|'invalid' }` (API.md §8); `src/lib/api.mock.ts` with the same exports, used when `EXPO_PUBLIC_API_MOCK=1` | `src/lib/api.ts` | ⚡ Wed 13:00 |
| auth | `signInApple()` (iOS only), `sendEmailCode(email)`, `verifyEmailCode(email, code)`, `signOut()`, `useSession(): { user: User \| null; provider: 'apple'\|'email'\|null }`, `useSyncStatus(): 'off'\|'idle'\|'syncing'\|'error'` | `src/lib/auth.ts`, `src/sync/index.ts` | ⚡ Thu 10:30 |
| export | `exportData(): Promise<Result>` (JSON per DATABASE.md, then the share sheet) | `src/lib/export.ts` | Thu 16:00 |
| report sheet | route `/(sheets)/prijava-greske` with params `{ date: 'YYYY-MM-DD', context: 'danas'\|'kalendar'\|'profil'\|'recipe', recipeId? }` | `src/app/(sheets)/prijava-greske.tsx` | Tue 18:00 |
| delete sheet | route `/(sheets)/brisanje` (account or local, per SCREENS.md §11) | `src/app/(sheets)/brisanje.tsx` | Thu 16:00 |
Never rename these after merge. If D asks for a change ("ZAHTJEV ZA A"), add it without breaking the old signature.

## A consumes from D
- T1 monorepo (Mon 14:30): you cannot start T2 before it is merged.
- T3 components and theme (Mon 18:30): Plan tab and sheets use only these (`GlassCard`, `Segmented`, `Chip`, `Pill`,
  `ScreenScroll`, `PrimaryButton`, `Icon`, `useToast`, text components). Never style raw `View`s with new colours.
- T5 route stubs (Tue 10:15): your screen files already exist; you replace their content.
- If something you need from D is missing, write "ZAHTJEV ZA D: ..." and build a local component inside your own
  feature folder for now.

## Tasks and prompts (paste one per session, after `/clear`, on a new branch `t/<id>-<name>`)

### T2 Core port (Mon 14:30, rules-engine; Opus to plan, Sonnet to build)
```
/model opus
Task T2 from docs/PLAN.md. Use the rules-engine subagent. Plan only first.
Owner A. Only edit packages/core/**. Port docs/reference/engine.js following docs/DOMAIN.md, tests first from the
golden tables in docs/TESTING.md §3. Export exactly the core names in docs/team/ANDREJ.md "A provides to D".
```
After you approve the plan: `/model sonnet`, then "Build it." Done when: all golden tests green, coverage ≥90% on rules,
plan and meals, `pnpm build:edge` writes core.js, /verify green.

### T4 Local DB + hooks + dev tools (Tue 9:00, main, Sonnet) ⚡ merge at 11:00
```
Task T4 from docs/PLAN.md. Owner A. docs/DATABASE.md §1.
Only edit: apps/mobile/src/db/**, src/store/**, src/hooks/**, src/test/**, src/lib/{clock,dev,location}.ts,
src/notifications/permissions.ts. Implement every T4 row of "A provides to D" in docs/team/ANDREJ.md with those exact
signatures (hooks, repos, test utils, dev tools, permissions). Android: create the notification channel inside
ensureNotificationPermission.
Done when: jest repo tests green with an in-memory adapter, settings survive an app restart on my Android phone,
/verify green.
```

### T9 Schema + RLS (Tue 11:00, supabase-backend, Sonnet, plan mode)
```
Task T9 from docs/PLAN.md. Use the supabase-backend subagent. Owner A. Only edit supabase/**.
Done when: supabase db reset and supabase test db are green, including the negative RLS tests. /verify green.
```

### T10 Edge functions + report sheet (Tue 14:00, supabase-backend then ui-builder, Sonnet)
```
Task T10 from docs/PLAN.md. Use the supabase-backend subagent for meal-suggest, health and the report limit
(docs/API.md). Then use the ui-builder subagent for src/app/(sheets)/prijava-greske.tsx and src/features/report/**
per docs/SCREENS.md §11 and COPY.md report block (src/copy/sr/report.ts). Owner A. Only those paths plus supabase/**.
Done when: deno tests green (400, 429, dropped bad recipe, fallback true), the sheet sends a report to local
Supabase from my Android phone, /verify green.
```
Then deploy to **dev** yourself: `supabase link --project-ref <dev-ref>`, `supabase db push`, `pnpm build:edge`,
`supabase functions deploy meal-suggest health`, `supabase secrets set ...`.

### T15 Notifications (Wed 9:00, rules-engine for the plan maths, then main, Sonnet) ⚡ merge at 11:00
```
Task T15 from docs/PLAN.md. Owner A. docs/DATABASE.md §5, COPY.md notif block (src/copy/sr/notif.ts),
docs/PLATFORMS.md §4 (Android channel). Use the rules-engine subagent for the plan list in packages/core, then wire
src/notifications/index.ts with the signatures in docs/team/ANDREJ.md, and fill
src/features/dev/sections/notifications.tsx (list scheduled + send test).
Done when: the core test for the plan list is green, "send test" arrives on my Android phone, /verify green.
```

### T14 api + mock (Wed 11:00, main, Sonnet) ⚡ merge at 13:00
```
Task T14 (lib/api part) from docs/PLAN.md. Owner A. Only edit apps/mobile/src/lib/{api,api.mock,supabase}.ts and
their tests. Signatures exactly as docs/API.md §8 and docs/team/ANDREJ.md. The mock returns 3 valid recipes and 1 that
contains the day's forbidden food, so D can test the device-side filter.
Done when: jest tests for every error branch (offline, 429, server, invalid) are green, /verify green.
```

### T11 Plan tab + kupovina sheet (Wed 13:30, ui-builder, Sonnet)
```
Task T11 from docs/PLAN.md. Use the ui-builder subagent. docs/SCREENS.md §4 and the kupovina sheet in §11.
Owner A. Only edit: src/app/(tabs)/plan.tsx, src/app/(sheets)/kupovina.tsx, src/features/plan/**, src/copy/sr/plan.ts.
Use useRange from src/hooks and D's components only. Meal plan button behind flags.mealPlan (P1).
Done when: jest tests for 7 and 30 days from 2.12.2026 pass, it looks right on my Android phone, /verify green.
```
D checks it on the iPhone at the 18:00 merge.

### T16 Spec document (Wed 16:00, main, Sonnet)
```
Task T16 from docs/PLAN.md. Owner A. Write docs/SPEC.md in Montenegrin, max 12 pages, by summarising CLAUDE.md,
docs/PLAN.md, DOMAIN.md, SCREENS.md, DATABASE.md, API.md, TESTING.md, PLATFORMS.md: read only their headings and
first paragraphs, then the sections you need. Do not copy whole sections.
```
Export: `pandoc docs/SPEC.md -o SPEC.docx` (or the docs skill), send it to the mentors Thursday morning.

### Legal pages (Wed 17:30, no Claude needed)
Fill every `[POPUNI ...]` in `docs/legal/`, copy the folder into the public repo `fastself-site`, enable GitHub
Pages, check that /privacy, /terms and /support open, and give D the three URLs for `src/config.ts` (via PR note).

### T17 Auth backend (Thu 9:00, supabase-backend, Sonnet, plan mode) ⚡ merge at 10:30
```
Task T17 (backend part) from docs/PLAN.md. Use the supabase-backend subagent. docs/API.md §3, docs/PLATFORMS.md §4.
Owner A. Only edit supabase/** and apps/mobile/src/lib/auth.ts, src/sync/consents.ts. Implement the auth signatures
in docs/team/ANDREJ.md; signInApple exists only for iOS (throws a typed error on Android, never called there).
apple-token function stores the refresh token in private.apple_tokens.
Done when: email OTP works on my Android phone against local Supabase (adb reverse), deno + pgTAP tests green,
/verify green.
```

### T18 Sync (Thu 10:30, main; Opus to plan, Sonnet to build)
```
/model opus
Task T18 from docs/PLAN.md. Owner A. docs/DATABASE.md §4. Only edit apps/mobile/src/sync/** and its tests.
Plan only first. Include useSyncStatus.
```
After approval: `/model sonnet`, "Build it." Done when: jest with a fake server is green and the same account on my
Android and Danilo's iPhone (dev project) sees changes after returning to the app.

### T19 Delete account + export (Thu 14:00, supabase-backend then ui-builder, Sonnet)
```
Task T19 from docs/PLAN.md. Owner A. docs/API.md §4, docs/SCREENS.md §11 brisanje, COPY.md delete block.
Use the supabase-backend subagent for delete-account (Apple revoke, cascade) and src/lib/export.ts; then the
ui-builder subagent for src/app/(sheets)/brisanje.tsx and src/features/brisanje/** (src/copy/sr/brisanje.ts).
Done when: pgTAP shows the cascade, a real test user is deleted on dev, export opens the share sheet on Android,
/verify green.
```

### Prod backend (Thu 16:00, you in your terminal, not Claude)
Run the commands in `.claude/skills/release-ios/SKILL.md` §2: `supabase link --project-ref <prod-ref>`, `supabase db push`, `pnpm build:edge`,
`supabase functions deploy ...`, `supabase secrets set ...`, Apple provider, custom SMTP. Then
`eas env:create` for production (PLATFORMS.md §6), `curl .../functions/v1/health`, add `PROD_HEALTH_URL` to GitHub
secrets. Write the prod ref into `.claude/prod-project-ref.txt`. Tell D "prod spreman" → he starts T22.

### Fri
- T24 audit (9:00): `/model opus`, then "Use the appstore-auditor subagent." Fix blockers in your paths; send D his
  as "ZAHTJEV ZA D". Run it once more after fixes, then `/model sonnet`. Max 2 runs.
- T23, one session per bug:
  ```
  Bug QA-<n> from docs/QA-LOG.md. Owner A. Reproduce with a failing test first, then fix. Only A's paths.
  ```
- T26: paste `docs/store/metadata.md` and APPSTORE.md §5–§7 into App Store Connect (browser, no Claude).
- T27 with D: final build and Submit for Review.
- If the mentors asked for Android: `eas build -p android --profile preview` and send them the link (PLATFORMS.md §7).
