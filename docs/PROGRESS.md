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
- Now: T6 done on branch t/T6-onboarding (stacked on T5, not pushed). Next: T7.
- Waiting for A: nothing.
- Log:
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
| T7 Danas | todo | | |
| T8 Kalendar | todo | | |
| T13 Profil + pushed screens | todo | | |
| T12 Tajmer | todo | | |
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
| T9 schema + RLS | todo | | |
| T10 edge functions + report sheet | todo | | |
| T15 notifications | todo | | |
| T14 lib/api + mock | todo | | |
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
- Now: T4 done (PR #5 merged); next T9 schema + RLS.
- Waiting for D: nothing.
- Log:
  - 2026-11-24 15:42 | T4 | on SM-S931B (Android 17) settings, AI consent and a running fast survive a force-stop; wipe keeps install id | T9
  - 2026-11-24 13:30 | T4 | SQLite v1 + repos, settings store, hooks, dev link + clock, permissions, @/test/utils; 108 jest tests green on in-memory SQLite | Android restart check, PR, then T9
  - 2026-11-23 18:40 | T2 | core ported, 456 tests, coverage rules 98% / plan 100% / meals 100%, build:edge ok | T4
  - 2026-11-23 13:00 | kit | kit received | setup
