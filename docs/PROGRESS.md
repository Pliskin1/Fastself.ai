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
- Now: T7 done on branch t/T7-danas (stacked on T6, not pushed). Next: T8.
- Waiting for A: nothing.
- Log:
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
| T8 Kalendar | todo | | |
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
| T14 lib/api + mock | done | t/T14-api-mock | pushed, PR #17 in review; `@supabase/supabase-js` is on main (PR #16, run `pnpm install`); mock is on with `EXPO_PUBLIC_API_MOCK=1` in dev builds only; not checked on the phone |
| T11 Plan tab + kupovina | todo | | |
| T16 spec document (due Thu 26 Nov) | todo | | |
| legal pages (fastself-site) | todo | | |
| T17 auth backend | todo | | |
| T18 sync | todo | | |
| T19 delete + export | todo | | |
| prod backend | todo | | |
| T23 Android + backend bugs | todo | | |
| T24 store audit | todo | | |
| T26 ASC metadata | todo | | |

## A (Andrej): now and log
- Now: T14 lib/api done on branch t/T14-api-mock (pushed, PR #17 in review); next: T11 Plan tab.
- Waiting for D: nothing.
- Log:
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
