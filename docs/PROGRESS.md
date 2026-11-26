# Progress

Claude reads only the top 30 lines at the start of each session. Keep "Now" short.
Each person edits **only his own block** (D block here, A block at the bottom) so merges never conflict.
Log format, newest first, max 3 lines per task: `date time | task | result | next`.

## Now (updated by D at the 18:00 merge, after both blocks are in)
- Day: Mon 23 Nov. Phase: T1 scaffold.
- Open decisions: D-07 AI provider, D-24 store language, D-25 Apple team, D-28 bundle id, D-29 OTP email sender.
- Blockers: none. Red tests: none.
- Schedules: docs/team/DANILO.md, docs/team/ANDREJ.md.

## D (Danilo): now and log
- Now: T8 done on branch t/T8-kalendar (off main, not pushed). Next: T13.
- Waiting for A: nothing.
- Log:
  - 2026-11-25 | T8 | Kalendar: month grid with orbs, today/selected/slava/nafila marks, month slide across years, day card, report; typecheck, lint, test:app 326, expo export ok | simulator check, push, T13
  - 2026-11-24 | T7 | Danas: dial, plate, receipt, izuzetak sheet, Ramadan/vaktija/nafila/slava cards, week strip; typecheck, lint, test:app 165, expo export ok | simulator + Maestro 01 check, push, T8
  - 2026-11-24 | T6 | 6 onboarding screens, PraksePicker, AlergijePicker, flow tests; typecheck, lint, test:app 150, expo export ok | simulator + Maestro check, push, T7
  - 2026-11-24 | T5 | 22 route stubs, NativeTabs sf+md, sheets, dev link listener, root layout (fonts, sky, toast); typecheck, lint, test:app 138, expo export ok | push, T6. Tab screens must use <ScreenScroll sky> (native tab container hides the root sky)
  - 2026-11-23 | T3 | theme, 22 primitives, /dev gallery, brand icons; typecheck, lint, test:app green, expo export ios+android ok | pnpm ios /dev check, merge, A pulls
  - 2026-11-23 14:50 | T1 | monorepo, Expo SDK 58 shell, core (pl), copy wiring; typecheck, lint, test:core, test:app green | merge, A pulls, then T3
  - 2026-11-23 13:00 | kit | kit received | T1

## Task board, D (Danilo)
| task | status | branch | notes |
|---|---|---|---|
| T1 scaffold | merged | t/T1-scaffold | PR #1 |
| T3 design primitives + icons | merged | t/T3-design-system | PR #7 |
| T5 navigation + route stubs | done | t/T5-navigation | simulator checked, not pushed |
| T6 onboarding | done | t/T6-onboarding | maestro 01 needs T7 for last assert |
| T7 Danas | done | t/T7-danas | IF streak complication and sync state deferred |
| T8 Kalendar | done | t/T8-kalendar | not pushed; Maestro 03 file does not exist in repo |
| T13 Profil + pushed screens | todo | | |
| T12 Tajmer | done | t/T12-tajmer | not pushed; digit cells duplicated from DayDial |
| T14 Asistent UI | todo | | |
| T17 auth UI | todo | | |
| T20 motion | todo | | |
| T21 E2E | todo | | |
| T22 TestFlight | todo | | |
| T25 screenshots | todo | | |
| T23 iOS bugs | todo | | |
| T27 submit (with A) | todo | | |

(spacer: keeps the two blocks apart so git never sees adjacent edits)

---

## Task board, A (Andrej)
| task | status | branch | notes |
|---|---|---|---|
| T2 core port | done | t/T2-core-port | merged (PR #4); rule packs: orthodox (svetosavlje.org), islamic (Diyanet-based); izcg calibrated (D-13) |
| T4 local DB + hooks | done | t/T4-local-db-hooks | merged (PR #5); Android restart check passed (SM-S931B, Android 17); adds zustand + expo-crypto (rebuild the dev build) |
| T9 schema + RLS | done | t/T9-schema-rls | pushed, PR in review; config is supabase/config.jsonc (CLI 3.4, not config.toml); explicit grants, anon gets 401 on user tables |
| T10 edge functions + report sheet | done | t/T10-edge-functions | merged (PR #14); phone check passed (SM-S931B); Anthropic request sends no temperature (haiku-5-5 answers 400), API.md §5 still lists it |
| T15 notifications | done | t/T15-notifications | merged (PR #15); Android check passed (SM-S931B); adds `settings.reminders` (kv, local only); needs D's one-line `startNotificationSync()` call in `_layout.tsx` |
| T14 lib/api + mock | done | t/T14-api-mock | merged (PR #17); `@supabase/supabase-js` is on main (PR #16, run `pnpm install`); mock is on with `EXPO_PUBLIC_API_MOCK=1` in dev builds only; emulator check passed (app starts, report 201); the four api calls have not run on a device, not checked on SM-S931B |
| T11 Plan tab + kupovina | done | t/T11-plan-kupovina | merged (PR #21); phone check passed (SM-S931B) for Plan 7/30, the consent gate and the kupovina sheet; the meal plan run and the checklist rows are not checked on a device (AI consent cannot be granted until ai-pristanak is built); Jelovnik card behind `flags.mealPlan` (`src/features/plan/flags.ts`, on in dev builds only) |
| T16 spec document (due Thu 26 Nov) | done | t/T16-spec | `docs/SPEC.md` (Montenegrin, 12 sections, about 2,700 words); export: `pandoc docs/SPEC.md -o SPEC.docx` (the .docx stays untracked); page count not measured (no Word on the Windows machine), estimated 10 to 11 of the 12 allowed |
| legal pages (fastself-site) | todo | | blocks Submit for Review: App Store Connect needs a live privacy policy URL and a support URL; Fri |
| T17 auth backend | done | t/T17-auth-backend | pushed, merged before the phone check so D can start the UI; OTP round trip passed on local Supabase with curl + Mailpit; email code sign-in passed on SM-S931B against local Supabase (26 Nov, during the T18 check); Apple exchange not run with a real key; dev project still needs db push, function deploy, Apple secrets, Apple provider, OTP 600 s and the email template |
| T18 sync | done | t/T18-sync | PR #24; jest sync 65, app 506, typecheck, lint green; `/code-review` and `/security-review` run (no security findings, four bugs fixed); phone check passed on SM-S931B against local Supabase (first sync, phone to server, a second sign-in to the phone, deletes); the check with D's iPhone on the dev project is still open; `docs/DATABASE.md` §1 and §4 are behind the code (request to D in the log) |
| T19 delete + export | done | t/T19-delete-export | merged (PR #26; dependency PR #25 adds expo-sharing + expo-file-system: rebuild the dev builds); delete-account + read_apple_token, brisanje sheet, lib/account (wipe waits for sync, signs out first), lib/export; test:app 561, deno 62, pgTAP 206; `/code-review` (10 of 12 fixed) and `/security-review` (no findings); local round trip passed; not yet: phone check, dev deploy, Apple revoke against Apple (D's iPhone) |
| prod backend | todo | | `fastself-prod` not created yet (ref file empty); first task Fri; release-ios §2 needs two fixes: no `meal-plan` in the deploy line (not built), `AI_PROVIDER=anthropic` (the code has no Cloudflare provider) |
| T23 Android + backend bugs | todo | | from the T19 review: sync requests have no timeout, so a hung run holds back the delete and the wipe; from the T18 review: run `validateRecipe` when a stored or pulled meal plan is read (`features/plan`; the card is dev-only today); `fastingSessions.stop()` leaves a second open fast running when both phones started one; a pull can overwrite an edit made while signed out or with the consent off; a signed-in cold start runs the sync twice |
| T24 store audit | todo | | |
| T26 ASC metadata | todo | | |

## A (Andrej): now and log
- Now: T19 merged (PR #25, #26). Plan for Fri 27 Nov:
  1. 9:00 with D: settle D-25 (who gives the Sign in with Apple key: Team ID, Key ID, .p8) and D-29 (SMTP: Brevo or Resend); `pnpm android` rebuild, T19 phone check on local (export share sheet, guest wipe to welcome, email account delete).
  2. 9:30 dev project: db push, deploy apple-token + delete-account, the open T17 Auth settings; delete one real test user on dev.
  3. 10:00 prod backend (create `fastself-prod`, release-ios §2 with the two fixes, Auth settings + SMTP, EAS production env, health, `PROD_HEALTH_URL`, ref file), then "prod spreman" to D for T22.
  4. While T22 builds: T24 audit, legal pages live, T26 ASC metadata.
  5. Afternoon: T23 bugs from QA round 1, then T27 build and Submit for Review with D.
- Waiting for D: Profil wiring for export and the delete row (comment on PR #26); the Apple key details for prod.
- Log:
  - 2026-11-26 22:55 | T19 | merged: PR #25 (expo-sharing, expo-file-system), PR #26 (T19); comment for D posted on #26 | Fri plan above
  - 2026-11-26 22:40 | T19 | delete-account (getUser check, Apple revoke best effort with 8 s timeout, deleteUser) + read_apple_token (service role only); brisanje sheet (account delete, then "Obrisati i podatke sa ovog telefona?"; guest wipe; waits for a stored session before offering the wipe); lib/account (runWhileSyncIdle, sign-out before the wipe, a lost answer finishes on user_not_found); lib/export (JSON + share sheet, old files cleared); test:app 561, deno 62, pgTAP 206; local round trip: 200, rows gone, second call 401 | PRs, `pnpm android` rebuild, phone check (export share sheet, guest wipe to welcome, email account delete), then dev deploy (db push, delete-account, apple-token)
  - 2026-11-26 22:40 | T19 | ZAHTJEV ZA D: Profil `onExport` → `exportData()` + `profil.export.done` and an error toast; `row-delete` label `profil.delete.account` when signed in; `SecondaryButton` fixed height 54 clips at large text; žar tone for PrimaryButton; COPY.md `delete.keepLocal`, `delete.error`; API.md §4 step 2 and DATABASE.md §6 lines (text in the PR comment); rebuild the iOS dev build | D's answer
  - 2026-11-26 20:23 | T18 | on SM-S931B against local Supabase: email code sign-in ok; the first sync uploaded 4 practices (fixed ids) and 1 fast; an allergen added on the phone was on the server in about 6 s; a second sign-in of the same account (a script through the real remote) added one allergen and removed one, and the phone showed both after returning to the app; a removal on the phone reached the server in about 8 s; status idle | merge PR #24, then the dev-project check with D's iPhone (seen once: a white screen when `fastself://dev` was first opened, gone after an app restart, cause not found; not checked on a device: profile sync, two real installs)
  - 2026-11-26 19:38 | T18 | sync in src/sync: pull then push, last write wins (D-11), fixed ids for practices, allergies and day marks, guest data queued at the first sync, refused rows leave the queue; startSync (sign-in, foreground, 5 s tick), syncNow, deleteServerCopy, useSyncRev; jest sync 60, app 501, typecheck, lint green | PR, local check on phone + emulator, then the dev-project check with D's iPhone (the real `createSupabaseRemote` ran against local Supabase from a script, 19 checks pass: paging filter, stamps, refused rows, profile, offline; not built: a catch-up for rows edited while signed out or with a consent off; a second account on one phone gets practices, allergies and day marks, not the first account's sessions and meal plans)
  - 2026-11-26 19:38 | T18 | ZAHTJEV ZA D: call `startSync()` once in `src/app/_layout.tsx` (until then sync starts only when `fastself://dev` is opened); in Profil, after sync is turned off, ask "Obrisati i kopiju na serveru?" and call `deleteServerCopy`, and let the sync error retry call `syncNow()`; Tajmer and Plan re-read on `useSyncRev()`; `docs/DATABASE.md` §1 (ids) and §4 (order, one mark per table) are behind the code, the replacement text comes with the PR; the protocol as built is at the top of `src/sync/engine.ts` | D's answer
  - 2026-11-26 09:30 | T17 | lib/auth (signInApple, sendEmailCode, verifyEmailCode, signOut, useSession, onAuthChange), sync/index (useSyncStatus), sync/consents (setConsents), apple-token function + save_apple_token, OTP 600 s and a code-only email template, auth section on /dev; jest 451, pgTAP 195, deno 44, typecheck, lint green; on local Supabase: otp 200, code in Mailpit, verify gives a session, consents insert 201, apple-token 401 without a user and 400 for a junk code | phone check on SM-S931B, push, PR, T18 (wrong and reused codes both answer 403 otp_expired, so the app tells "expired" by its own 600 s clock; the send time is kept in memory only)
  - 2026-11-26 09:30 | T17 | ZAHTJEV ZA D: I added two lines to `src/app/dev.tsx` to mount the auth section (your file; say if you want it moved). In Profil, write sync and AI consent through `setConsents` from `@/sync/consents` instead of `consents.set`: it also writes the server row and refreshes `useSyncStatus`, which otherwise stays stale after the switch | D's answer
  - 2026-11-25 17:45 | T16 | docs/SPEC.md: the 12 template sections in Montenegrin, summarised from the docs, with the state on 25 Nov (core 473 and jest 392 run on main today; pgTAP 184 and deno 31 are the T10 numbers, not rerun); exported to SPEC.docx with pandoc | open SPEC.docx and check it is at most 12 pages (estimated 10 to 11 at pandoc's default 12 pt), commit, PR, send Thursday morning, legal pages
  - 2026-11-25 16:40 | T11 | on SM-S931B (Android 17), dev clock 2.12.2026: Plan 7 and 30 days look right (header, bar and stats, timeline line and glow); the Jelovnik button opens the consent sheet while consent is off; the kupovina sheet ghosted the screen behind at 0.96 alpha, now opaque (color.ink) | open the PR, T16 (not checked on a device: the meal plan run, meal lines and checklist rows, they need AI consent; prijava-greske has the same 0.96 background, one-line fix for T23; Android sheets have square corners and no grabber, SHEET in _layout.tsx)
  - 2026-11-25 15:35 | T11 | Plan tab (7/30, stacked bar + stats, timeline with Ramadan, IF and slava lines), Jelovnik card behind flags.mealPlan (consent, mealPlan(), device validateRecipe, stored in meal_plans), kupovina sheet (ticks in shopping_checks); jest plan 26, app 343, typecheck, lint green | Android phone check, push, PR, T16 (storage lives in src/features/plan/storage.ts, move to src/db/repo with T18; the consent round trip cannot be checked until D builds ai-pristanak: Plan runs the pending action on focus once consents 'ai' is on)
  - 2026-11-25 15:35 | T11 | ZAHTJEV ZA D: a Ramadan (sun) tone on Pill (Timeline has a local gold pill), a token for the "bez posta" segment (level.mrsno.hex is used, brighter than the prototype), and these new keys in COPY.md: plan.stat.ramadan, plan.stat.free, plan.days.label, plan.meal.line, plan.meal.name.*, plan.meal.error.rate, plan.meal.error.server, plan.line.ifInside, plan.line.nafila, plan.line.slava | D's answer
  - 2026-11-25 | T14 | emulator check on merged main 8e4fa22 (AVD Medium_Phone_API_37.0): app starts on Danas, no JS errors in the app log, the report sheet sent a report to local Supabase and got 201 with adb reverse; suggestMeals, mealPlan, appleToken, deleteAccount have not run on a device, and it was not the SM-S931B | T11 (on Android the prijava-greske sheet is see-through, the Danas text shows behind the form: T23 candidate; kupovina uses the same background, check it too)
  - 2026-11-25 12:11 | T14 | lib/api: suggestMeals, mealPlan, appleToken, deleteAccount through the Supabase client (30 s timeout), getSupabase() (null without env), api.mock (3 passing recipes + 1 with a forbidden food); jest lib 146, app 317, typecheck, lint, android export green | push both branches, 2 PRs (dependency first), T11 (suggestMeals takes { forbidden, avoid, meal, ingredients } and adds locale, install id and rule pack version itself; meal-plan, apple-token and delete-account are not on the server yet and answer 'server'; T10 functions are still not deployed to dev; settings.customAvoid has no shape limit but meal-suggest takes only letters and spaces, 30 chars, 10 words, so other words answer 'invalid')
  - 2026-11-25 11:20 | T15 | on SM-S931B (Android 17): test notification arrived on channel podsjetnici; after "Zakaži ponovo" /dev lists 6 evening reminders (26.11–1.12 at 20:00, Orthodox only on the phone); IF window and Ramadan reminders not checked on the phone | PR review, T14 api (the dev screen opens only through `fastself://dev`; nothing reschedules by itself until D adds startNotificationSync())
  - 2026-11-25 10:48 | T15 | core planNotifications (7 days, max 60) + src/notifications (scheduleIfEnd, cancelIfEnd, rescheduleAll, sendTestNotification, listScheduled, startNotificationSync), reminder switches in settings.reminders, /dev section; core 473, jest 220, typecheck, lint green | Android check, push, PR, T14 api (ZAHTJEV ZA D: call startNotificationSync() once in _layout.tsx; Profil switches read and write settings.reminders)
  - 2026-11-25 10:02 | T10 | report sent from SM-S931B (Android 17) to local Supabase: 201, row saved with type, day, context, rule pack 0.1, app 1.0.0, no user id | push, PR (the phone needs `adb reverse tcp:54321 tcp:54321`; the forward dropped several times during the check)
  - 2026-11-25 09:40 | T10 | meal-suggest + health, public.bump_ai_usage (definer, service role only), report sheet + sendReport; pgTAP 184, deno 31, jest report 10 + api 14; serve + curl on local: 21st call 429, report insert 201 | phone check, PR, deploy to dev, T15 (serve needs a scratch env file: the bash hook blocks any command naming supabase/.env.local)
  - 2026-11-24 23:44 | T9 | 2 migrations (schema, RLS, grants; rule_packs seed), 6 pgTAP files 173 tests, db reset + test db + /verify green; real signup and anon/user REST calls checked on local | PR review and merge, T10 (insert reports without .select(); private.ai_usage is not reachable through the API)
  - 2026-11-24 15:42 | T4 | on SM-S931B (Android 17) settings, AI consent and a running fast survive a force-stop; wipe keeps install id | T9
  - 2026-11-24 13:30 | T4 | SQLite v1 + repos, settings store, hooks, dev link + clock, permissions, @/test/utils; 108 jest tests green on in-memory SQLite | Android restart check, PR, then T9
  - 2026-11-23 18:40 | T2 | core ported, 456 tests, coverage rules 98% / plan 100% / meals 100%, build:edge ok | T4
  - 2026-11-23 13:00 | kit | kit received | setup
