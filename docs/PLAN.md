# Build plan: fastself.ai v1.0 (iOS release; Android runs from the same code)

Owners: **D** = Danilo (app UI, navigation, motion), **A** = Andrej (core, Supabase, legal, App Store Connect).
Both do QA. Each person runs their own Claude Code session on their own branch.
Only D has a Mac and an iPhone: anything that needs Xcode, the iOS Simulator, Maestro or the iPhone is D's. A has Windows
and an Android phone: core (Vitest), Supabase (Docker), Deno functions, legal, App Store Connect, EAS cloud builds and
submits, and he runs the same app on Android (`pnpm android`) to see and test his work. One codebase, one app.
Dates are Nov 2026. "Prompt" is what you paste into Claude Code, after `/clear`, to start the task.
Tasks without their own "Prompt" line use: `Task T<n> from docs/PLAN.md. Use the <subagent> subagent.`

## Task matrix: who, which agent, which model (this is also the credit budget)
Default model is **Sonnet** (set in `.claude/settings.json`). **Opus only where the table says so** (3 moments in the
whole week). "Main" = no subagent: the task is small or interactive. Every task ends with `/verify` (runs on Haiku).
| Task | Day | Owner | Platform work | Subagent | Model | Plan mode |
|---|---|---|---|---|---|---|
| T1 scaffold | Mon | D | both (D checks iOS, A checks Android after merge) | main | Sonnet | no |
| T2 core port | Mon | A | none (pure TS) | rules-engine | **Opus to plan**, Sonnet to build | yes |
| T3 design primitives + icons | Mon | D | glass, Icon, keyboard (PLATFORMS §4) | ui-builder | Sonnet | yes |
| T4 local DB + hooks | Tue 9–11 | A | none | main | Sonnet | no |
| T5 navigation | Tue | D | tab icons `sf` + `md`, Android back | main | Sonnet | no |
| T6 onboarding | Tue | D | notification + location permissions | ui-builder | Sonnet | yes |
| T7 Danas | Tue | D | none | ui-builder | Sonnet | yes |
| T8 Kalendar | Wed | D | none | ui-builder | Sonnet | no |
| T9 schema + RLS | Tue | A | none | supabase-backend | Sonnet | yes |
| T10 edge functions | Tue | A | none | supabase-backend | Sonnet | yes |
| T11 Plan tab + kupovina sheet | Wed | A | Android first, D checks iOS | ui-builder | Sonnet | no |
| T12 Tajmer | Wed | D | Android notification channel | ui-builder | Sonnet | no |
| T13 Profil + pushed screens | Wed | D | share sheet (same API) | ui-builder | Sonnet | no |
| T14 Asistent | Wed (A api + mock), Thu (D UI) | A (lib/api), D (UI) | none | supabase-backend, then ui-builder | Sonnet | no |
| T15 notifications | Wed | A | Android channel, Android permission | rules-engine (maths), main (wiring) | Sonnet | no |
| T16 spec document | Wed | A | none | main | Sonnet | no |
| T17 auth | Thu | D (UI), A (backend) | **Apple iOS only**, email both | ui-builder, supabase-backend | Sonnet | yes |
| T18 sync | Thu | A | none | main | **Opus to plan**, Sonnet to build | yes |
| T19 delete + export (function, sheet, export) | Thu | A | none | supabase-backend, ui-builder | Sonnet | no |
| T20 motion | Thu | D | Reduce Motion on both | ui-builder | Sonnet | no |
| T21 E2E | Thu | D | iOS only (Maestro); A runs the Android smoke list | main + test-runner | Sonnet | no |
| T22 TestFlight | Thu 17:00 (after A sets up prod) | D | iOS (+ Android APK only if mentors ask) | `/release-ios` (human runs EAS) | Sonnet | no |
| T23 bug bash | Fri | both | per bug | main, one session per bug | Sonnet | no |
| T24 store audit | Fri | A | iOS | appstore-auditor | **Opus** (max 2 runs) | no |
| T25 screenshots | Fri | D | iOS only | none (Maestro) | — | — |
| T26 ASC metadata | Fri | A | iOS | none (browser) | — | — |
| T27 submit | Fri | both | iOS | `/release-ios appstore` | Sonnet | no |
Parallel rule: D and A work at the same time on different tasks and different paths. Exact ownership, the contracts
between them and the hour-by-hour order: `docs/team/DANILO.md` and `docs/team/ANDREJ.md`. Those files win over the
day headings below when the order differs. Split: about 33 hours of work each, Friday included.


## Scope tiers
- **P0, must ship for review**
  - The 5 onboarding steps.
  - Tabs: Danas, Kalendar, Plan (7/30 + stats), Tajmer, Profil.
  - Screens: Prakse (with mjera posta and slava), Alergije, Vaktija, Privatnost.
  - Šta da jedem: built-in recipes plus AI with consent, validated.
  - Error reports; local notifications (evening before, sehur/iftar, IF end).
  - Optional account (Apple and email OTP), sync with consent, export JSON, in-app account deletion with Apple token revoke.
  - Privacy policy and support URLs.
- **P1, ship if green by Thu 18:00, otherwise hide behind a flag**
  - AI 7-day meal plan and the shopping list.
  - Exceptions and kaza counter, the Ramadan 30-day tracker, Lejletul-kadr and Bajram lines.
  - Moon and "po starom" complications.
  - Motion polish: stagger, odometer and dial draw-in.
- **P2, v1.1, not now**
  - Live Activity and widgets, English UI, iPad, the Android store release, remote rule-pack updates.

Cut rule: if a P0 item is red at the end of Thursday, cut P1 first, never P0 compliance items
(deletion, consent, privacy URL, no placeholders).

## Day 0, Mon 23 Nov morning (humans only, about 2 h). See `START-OVDJE.md` §2–3
- [ ] Decide: AI provider (default Anthropic), Apple team (Coinis org or personal), bundle id `ai.fastself.app`,
      legal entity name for the policy, support email, OTP email sender (D-29: Resend with a domain, or Brevo).
- [ ] Accounts and access:
  - Apple Developer + App Store Connect (app record created, bundle id with Sign in with Apple capability).
  - Expo, GitHub repo, two Supabase projects (`fastself-dev`, `fastself-prod`, region eu-central-1).
  - Anthropic Console key with a $10 limit.
- [ ] D, Mac: Xcode 26, Node 22+, pnpm, Watchman, CocoaPods, Docker Desktop, Supabase CLI, EAS CLI, Maestro, Deno,
      Claude Code, Expo plugin. A, Windows: Git, Node, pnpm, VS Code, Docker Desktop, Supabase CLI (Scoop), Deno,
      EAS CLI, Android Studio, Claude Code, Expo plugin. Exact commands: START-OVDJE.md §4.
- [ ] A: collect reference data, scanned or photographed:
  - the IZ CG vaktija for Podgorica (any 5 dates, including one in summer time);
  - the Orthodox church calendar pages for Dec 2026–Jan 2027 and Mar–May 2027.
  Save them in `docs/reference/sources/`.

---

## Day 1, Mon 23 Nov: foundation

### T1 Scaffold monorepo (D, main session, Sonnet, about 45 min)
Prompt:
> Read CLAUDE.md. Do task T1 from docs/PLAN.md. Use the Expo plugin.

Steps:
1. Root: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.gitignore` and prettier config already exist in the kit.
   Add dev deps with `pnpm add -Dw typescript prettier eslint typescript-eslint eslint-plugin-react-hooks esbuild`,
   an `eslint.config.mjs` (flat config) and `tsconfig.base.json` (strict, noUncheckedIndexedAccess).
2. `apps/mobile` via `npx create-expo-app@latest apps/mobile --template default@sdk-58`.
   - Keep its generated AGENTS.md and CLAUDE.md; append one line pointing to the root CLAUDE.md.
   - Then remove the template demo screens.
   - Set `"name": "mobile"` in `apps/mobile/package.json` (the root scripts filter on it) and add the scripts
     `"typecheck": "tsc --noEmit"` and `"test": "jest"` (jest-expo preset).
   - Create `apps/mobile/.env.example` with `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and
     `EXPO_PUBLIC_SUPABASE_ANON_KEY=`. The human copies it to `.env.local` and fills the key from `supabase status`.
3. `packages/core` (package name `@fastself/core`): `src/index.ts` and `src/edge.ts`, Vitest, `tsconfig`, and the
   scripts `typecheck`, `test` (`vitest run`), `build:edge` (esbuild bundles `src/edge.ts` to
   `../../supabase/functions/_shared/core.js`, format esm) and `print-days` (prints the day plan for a date range,
   used for the accuracy check). Wire `@fastself/core` into mobile through the workspace.
   Metro must resolve it.
4. `supabase init` at the root, plus `supabase/functions/_shared/`.
5. `.github/workflows/ci.yml` already exists. Make sure its scripts resolve.
6. `apps/mobile/app.config.ts`:
   - name `fastself.ai`, slug `fastself`, scheme `fastself`, `ios.bundleIdentifier` `ai.fastself.app`,
     `android.package` `ai.fastself.app`, an Android adaptive icon (same glyph on `#03040D`).
   - `ios.supportsTablet: false`, `userInterfaceStyle: 'dark'`, `ios.config.usesNonExemptEncryption: false`.
   - Plugins: expo-router, expo-font, expo-sqlite, expo-notifications, expo-apple-authentication, expo-location.
   - `NSLocationWhenInUseUsageDescription` from COPY.md `perm.location`.
   - Android and plugin options exactly as PLATFORMS.md §5.
7. `apps/mobile/eas.json` exactly as PLATFORMS.md §6. (`eas init`, which adds the project id, is run later by a human.)

DoD: `pnpm typecheck`, `pnpm test:core` (1 dummy test) and `pnpm ios` work (D, Simulator shows a blank dark screen);
after merge A runs `pnpm android` on Windows and sees the same screen on his phone or emulator.

### T2 Port core engine (A, subagent `rules-engine`, about 4 h)
Prompt:
> Use the rules-engine subagent for task T2 in docs/PLAN.md. Port from docs/reference/engine.js into packages/core
> following docs/DOMAIN.md. Tests first, using the golden tables in docs/TESTING.md §3.

Modules:
- `calendar/`: DayNum, LocalDate, Europe/Podgorica DST, Julian Easter, Julian date, tabular Hijri with shift.
- `rules/`: the orthodox rule engine driven by `rule-packs/orthodox.v0.1.json`, mjera posta, feasts, and islamic
  (ramadanDay, nafila).
- `prayer/`: an adhan wrapper with methods MWL, Turkey and UmmAlQura, plus `IZCG` (MWL + offsets), city list
  and minute offsets.
- `sky/`: sunAltitude, skyColors, moonPhase, moonPath.
- `plan/`: `dayPlan()`, window combination (Ramadan + IF, nafila + IF, IF only), `nextDays()`, `rangeStats()`.
- `meals/`:
  - Data: categories, keyword map, FORBID map, diets, EU 14 allergens.
  - Logic: `forbiddenFor()`, `validateRecipe()`, `recipes.sr.json` (all 18 from engine.js), `shoppingList()`.
- `slava/`: the saints list and `nextSlava()`.
- `edge.ts`: exports only meals and the rule types needed by the server.

DoD:
- All golden tests pass and line coverage is at least 90% on `rules/`, `plan/` and `meals/`.
- `pnpm build:edge` writes `supabase/functions/_shared/core.js`.

### T3 Design system primitives (D, subagent `ui-builder`, about 3 h)
Prompt:
> Use the ui-builder subagent for task T3. Read docs/DESIGN-SYSTEM.md fully. Build apps/mobile/src/theme and
> src/components primitives with a dev-only gallery screen at /dev.

Theme and primitives:
- tokens.ts, fonts (Bodoni Moda 400/500, Hanken Grotesk 400–700), Text components (Display, Title, Body, Caption).
- SkyBackground (gradient from `core/sky` + stars + moon + horizon glow), GlassCard, GlassChip.
- PrimaryButton, SecondaryButton, LinkButton, IconButton, Switch, Segmented, Choice card, Pill, Toast host.
- `useMotion()` (curves and durations, Reduce Motion aware) and `haptics.ts`.

Brand assets (same task): `assets/brand/glyph.svg` (the dial glyph from the prototype header) and
`scripts/icons.mjs` (sharp) that writes `icon.png` 1024×1024 without alpha, `adaptive-icon.png` (glyph inside the
66% safe zone), `notification-icon.png` 96×96 white on transparent, and `splash-icon.png`. Run it once and commit the PNGs.
Platform: `GlassCard`, `Icon` and `KeyboardScreen` follow PLATFORMS.md §4, each with one Android Jest test.
DoD: the /dev gallery renders every primitive; VoiceOver reads every control; Reduce Motion stops all motion except opacity.
A opens the same /dev gallery on Android after merge.

### T4 Local data layer + hooks (A, main, about 2 h, Tue 9–11; signatures in docs/team/ANDREJ.md)
Prompt:
> Task T4. Implement apps/mobile/src/db per docs/DATABASE.md §1 (expo-sqlite, migrations via user_version) and
> src/store (zustand) with repository functions. Unit-test the repo with jest using an in-memory adapter.

DoD: a fresh install creates the schema and settings persist across app restarts (manual check in the Simulator);
the jest tests are green.

End of day 1: update PROGRESS.md and merge T1–T3 into main (T4 lands Tue 11:00).

---

## Day 2, Tue 24 Nov: core screens and backend

### T5 Navigation shell (D, about 1 h)
- `src/app/_layout.tsx`: font loading with the splash screen held, DB init, SkyBackground behind everything,
  and a Stack with screens and sheets per SCREENS.md §0.
- `(tabs)/_layout.tsx`: NativeTabs with 5 triggers, `<NativeTabs.Trigger.Icon sf=... md=...>` icons (PLATFORMS.md §4)
  and tint `#FFC86E`.
- `index.tsx` redirects to onboarding while `settings.onboarded` is false.
DoD: all routes open (stub screens); iOS back swipe works (D); Android system back closes sheets and pops screens (A).

### T6 Onboarding, 5 steps (D, ui-builder, about 3 h)
Prompt:
> Use ui-builder for T6. Build the onboarding screens exactly per docs/SCREENS.md §1 and docs/COPY.md "onboarding".
DoD: the full flow writes to the store, the minor toggle disables IF, permissions are requested only on step 4, and
"Nastavi bez naloga" lands on Danas. Jest test: the flow state machine.
Platform: Android asks `POST_NOTIFICATIONS` and coarse location on the same step; A checks it on his phone.

### T7 Danas (D, ui-builder, about 4 h)
Prompt:
> Use ui-builder for T7. Danas per SCREENS.md §2: DayDial, complications, plate card, why receipt, Ramadan card,
> nafila card, slava card, week strip. All data from core.dayPlan().
DoD:
- Jest snapshot-free tests: render with fixture settings for 2.12.2026 16:30, 4.12.2026 and 8.2.2027 16:30, then
  assert the visible title, countdown label and chips.
- The dial updates every second without re-rendering the whole screen (Reanimated shared values).

### T8 Kalendar (D, about 2 h)
SCREENS.md §3. Month grid with level orbs, today ring, slava star, Ramadan fill, selected day card, month slide.
DoD: tests for 15.3.2027 (Veliki post start) and Dec 2026; month navigation across years.

### T9 Supabase schema and RLS (A, subagent `supabase-backend`, about 3 h)
Prompt:
> Use supabase-backend for T9. Create migrations per docs/DATABASE.md §2–3, seed rule_packs, and write pgTAP tests per
> TESTING.md §5. Run supabase db reset and supabase test db until green.
DoD:
- All 9 public tables and 2 private tables exist, and RLS is on everywhere.
- Negative tests prove user A cannot read or write user B, and anon cannot read user tables.
- Deleting an auth user cascades.

### T10 Edge functions (A, supabase-backend, about 3 h)
Prompt:
> Use supabase-backend for T10. Implement meal-suggest, health and report-limit logic per docs/API.md, importing
> ../_shared/core.js. Deno tests with a mocked provider. Serve locally and curl it.
DoD:
- Invalid input returns 400 and the rate limit returns 429.
- Every AI recipe that breaks a rule is dropped.
- When no recipe passes, the function returns `fallback: true` with built-in recipes.

End of day 2: PROGRESS.md; merge. A deploys schema and functions to **dev** only.

---

## Day 3, Wed 25 Nov: remaining screens, AI, spec

Wednesday order (avoids waiting): A does T15 first (D's T12 uses `src/notifications`), then the T14 `lib/api`, then
T16. D does T11, T13, then T12 and the T14 UI.

### T11 Plan tab + kupovina sheet (A, about 2 h)
SCREENS.md §4. Segmented 7/30, the stacked bar plus stats, the timeline, the meal plan card (P1 button hidden behind
`flags.mealPlan`).

### T12 Tajmer + IF notifications (D, about 3 h)
SCREENS.md §5.
- Timer state persists in `fasting_sessions`, and the ring is driven by shared values.
- Schedule the end-of-fast notification when it starts and cancel it when it stops (Android: channel first, PLATFORMS.md §4).
- Show the 7-day history.
DoD:
- The timer survives an app kill (kill it in the Simulator and reopen); the notification fires (Simulator).
- Jest: elapsed and goal maths.

### T13 Profil + pushed screens (D, about 3 h)
SCREENS.md §6–9: Profil groups, Prakse (shared component with onboarding), Alergije, Vaktija (method, offsets, Ramadan
shift), Privatnost (in-app summary + link to the policy URL). The export row calls `exportData()` from A's
`src/lib/export.ts` (T19); the delete row opens A's `/(sheets)/brisanje`.

### T14 Šta da jedem (Asistent) + AI consent (A builds lib/api, D builds UI, about 3 h)
SCREENS.md §10, API.md §1.
- The built-in tab works offline.
- The AI tab needs consent (`sheets/ai-pristanak`), then shows loading steps and skeleton, then results and the rejected list.
- Client-side validation runs again on the device.
DoD:
- Jest: a forbidden recipe from the mocked API is never rendered.
- Manual: airplane mode shows the built-in recipes and a clear error message for AI.

### T15 Notifications scheduler (A, rules-engine for maths, about 2 h)
DATABASE.md §5 and COPY.md "notif".
- Plan the next 7 days (at most 60 requests): the evening before a fast day at 20:00, sehur at fajr−30, and iftar at maghrib.
- Reschedule on foreground and on settings change.
DoD: core test for the plan list; the Android channel `podsjetnici` is created at app start; manual check on both
platforms that tomorrow's reminders are pending (`getAllScheduledNotificationsAsync` shown in /dev) and that "send test"
arrives (A on Android, D on iPhone).

### T16 Spec document for mentors, due Thu (A, main, about 1 h)
Prompt:
> Generate docs/SPEC.md following the 12 sections of the original template (Intro, Stakeholders, Functional, Non-functional,
> Architecture, Data model, API, UI, Tech stack, Testing, Project plan, Revision history) by summarising our docs.
> Max 12 pages. Montenegrin.
A then exports it to .docx with pandoc and sends it.

End of day 3: D runs the dev build on his iPhone (`pnpm ios:device`), A on his Android phone (`pnpm android`), and both do a first manual run-through.

---

## Day 4, Thu 26 Nov: accounts, sync, deletion, polish, TestFlight

### T17 Auth (D + A, about 3 h)
API.md §3, SCREENS.md §11.
- Sign in with Apple (**iOS only**; the button is not rendered on Android): native button, nonce, `signInWithIdToken`,
  then send `authorizationCode` to the `apple-token` function, which stores the refresh token.
- Email OTP: `signInWithOtp` + `verifyOtp` with a 6-digit code.
- The consent screen writes `consents` rows.
- Session storage through `expo-sqlite/localStorage`.
DoD:
- Locally: OTP from Mailpit (http://127.0.0.1:54324) works on both platforms (Android needs `adb reverse`, PLATFORMS.md §3).
- Apple sign-in works on D's iPhone against dev. Jest: the Apple button is absent when `Platform.OS = 'android'`.

### T18 Sync (A, about 3 h)
DATABASE.md §4.
- An outbox with push and pull, last-write-wins on `updated_at`, filtered by the consent flags.
- Restore on a new device.
DoD: jest with a fake server; manual check: the same account on D's iPhone and A's Android phone sees changes after foreground.

### T19 Delete account + export (A, about 2 h)
API.md §4.
- The `delete-account` function revokes Apple, deletes the auth user and returns ok.
- The app shows the sheet, calls it, signs out and optionally wipes local data.
DoD: pgTAP shows the cascade; E2E on dev deletes a real test user; the Apple revoke returns 200 (check the logs).

### T20 Motion polish, P1 (D, about 2 h)
DESIGN-SYSTEM.md §6: entering stagger, odometer digits, dial draw-in, sun breathing, sheet haptics.
Everything is off under Reduce Motion.

### T21 E2E (D, test-runner, about 2 h)
TESTING.md §6: write the Maestro flows in `e2e/maestro/` and make them pass on the iPhone 17 Simulator dev build
(iOS only). The same evening A runs the Android smoke list (PLATFORMS.md §8).

### T22 First release build (D, human-run skill `/release-ios`, about 1 h + queue, after A sets up prod)
- `eas build -p ios --profile production`, then `eas submit`.
- TestFlight: internal group for the team; external group "Mentori" (Beta App Review).
DoD: the build installs from TestFlight on D's iPhone (and the mentors' iPhones once Beta Review passes); QA matrix round 1 (TESTING.md §8) is logged.
Only if the mentors ask for Android: A runs `eas build -p android --profile preview` and sends them the APK link
(PLATFORMS.md §7). No Play Store this week.

---

## Day 5, Fri 27 Nov: QA, compliance, submit
- T23 Bug bash: fix everything marked P0 from round 1. One Claude session per bug, then `/clear`.
- T24 Run the `appstore-auditor` subagent. Fix every finding.
- T25 Screenshots, 6.9" (iPhone 17 Pro Max Simulator), via the Maestro `takeScreenshot` flow `e2e/maestro/screenshots.yaml`.
- T26 App Store Connect metadata, privacy labels, age rating, review notes per APPSTORE.md. Privacy and support pages live.
- T27 Final build: build (EAS raises the build number), submit and **Submit for Review**. Post the TestFlight link to the mentors.

Sat 28 / Sun 29: buffer. Answer App Review within hours. Common fixes are in APPSTORE.md §9.

## Definition of done for v1.0
- The PDF brief's DoD:
  - The app runs on a real phone.
  - Orthodox rules and Easter for 2026 and 2027 match the official calendar.
  - Ramadan times for Podgorica match the IZ CG vaktija within ±2 min after offsets.
  - The IF timer notifies.
  - AI returns a compliant meal.
- Every P0 test in TESTING.md is green. The auditor reports 0 blockers. The QA matrix is fully checked on the iPhone and the Simulator; the Android smoke column has no S1.
