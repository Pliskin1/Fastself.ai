# fastself.ai: guide for Claude Code

fastself.ai is a fasting companion for Montenegro, one Expo codebase for iOS and Android (iOS ships first). It covers Orthodox fasting (Julian calendar),
Ramadan with voluntary Islamic fasts, and intermittent fasting (IF), and any combination of them. It has a
day dial, a calendar, a 7/30-day plan, an IF timer and meal suggestions that are always validated
against the day's rule and the user's allergies. It is local-first and the account is optional.

**Deadline:** submit to App Store review on **Fri 27 Nov 2026**; TestFlight external group on Thu 26 Nov.
The scope tiers (P0, P1, P2) are in `docs/PLAN.md`. Never add scope without asking a human.

## Read on demand (never read everything at session start)
| When | Read |
|---|---|
| start of any task | top 30 lines of `docs/PROGRESS.md` |
| picking or planning a task | `docs/PLAN.md`, only that task's block |
| fasting rules, dates, times, combos | skill `fastself-domain`, then `docs/DOMAIN.md` |
| building a screen | skill `new-screen`, `docs/SCREENS.md` (that screen only), `docs/DESIGN-SYSTEM.md` |
| UI text | `docs/COPY.md` (that screen's block) |
| SQLite, Postgres, RLS, sync | `docs/DATABASE.md` |
| edge functions, AI | `docs/API.md` |
| tests | `docs/TESTING.md` |
| App Store, privacy, review | `docs/APPSTORE.md` |
| store texts, legal pages | `docs/store/metadata.md`, `docs/legal/` |
| E2E flows, dev deep link | `e2e/maestro/README.md`, `docs/SCREENS.md` §0 |
| iOS vs Android differences, running on each, eas.json | `docs/PLATFORMS.md` |
| who owns which path, contracts between D and A | `docs/team/DANILO.md`, `docs/team/ANDREJ.md` |
| why X is the way it is | `docs/DECISIONS.md` |
| porting logic from the prototype | `docs/reference/engine.js` (grep by function name) |
| exact visual reference | `docs/reference/prototype/Main.dc.html`: grep a section comment such as `<!-- DANAS -->`; it is 340 KB, never read it whole |

## Stack (fixed; see DECISIONS)
- pnpm workspaces monorepo, TypeScript `strict` everywhere, Node 22+.
- `apps/mobile`: Expo SDK 58 with the New Architecture. The rest of the app stack:
  - Navigation: Expo Router (`expo-router/native-tabs`, Stack, `formSheet` sheets).
  - Motion and drawing: Reanimated 4, react-native-svg.
  - Surfaces: expo-glass-effect, with expo-blur as the fallback, and expo-linear-gradient.
  - Device: expo-sqlite, expo-notifications, expo-location, expo-apple-authentication, expo-haptics.
  - Fonts: expo-font with `@expo-google-fonts/bodoni-moda` and `@expo-google-fonts/hanken-grotesk`.
  - State, validation and backend client: zustand, zod, `@supabase/supabase-js`.
- `packages/core`: pure TypeScript with no React Native imports. Its only runtime deps are `adhan` and `zod`. Tests run on Vitest.
- `supabase/`: Postgres (EU, Frankfurt), RLS, and Edge Functions (Deno, TypeScript). The AI provider sits behind one
  interface; the default is Anthropic `claude-haiku-5-5`.
- Tests:
  - Vitest for core, and Jest with jest-expo and @testing-library/react-native for the app.
  - pgTAP through `supabase test db`, and `deno test` for functions.
  - Maestro for E2E on the iOS Simulator.

## Commands (run from repo root)
```
pnpm install                     # all workspaces
pnpm typecheck | pnpm lint       # whole repo
pnpm test:core                   # Vitest, packages/core
pnpm test:app                    # Jest, apps/mobile
pnpm build:edge                  # bundles core subset into supabase/functions/_shared/core.js
pnpm ios                         # = npx expo run:ios in apps/mobile (local dev build, iOS Simulator; Mac only)
pnpm android                     # = npx expo run:android (emulator or USB phone; works on Windows)
supabase start | supabase db reset | supabase test db
supabase functions serve --env-file supabase/.env.local
deno test supabase/functions     # function unit tests
maestro test e2e/maestro         # E2E, needs Simulator + dev build running
```
Install native packages with `npx expo install <pkg>` inside `apps/mobile` (SDK-matched versions), never plain `pnpm add`.

## Hard rules
1. `packages/core` is the only source of truth for rules, dates, prayer times, sky, moon and validation. UI code never
   re-implements logic. If the UI needs a value, add a tested function to core.
2. Network calls exist only in `apps/mobile/src/lib/api.ts` and `apps/mobile/src/lib/supabase.ts`.
3. AI is called only through the `meal-suggest` and `meal-plan` edge functions, and only after the user gave AI consent.
   Never send it a name, email, user id, practice names, religion, location or safety answers. The payload holds only
   the forbidden categories, the custom avoid words, the meal, the chosen ingredients and the locale.
4. Every recipe shown to the user, AI or built-in, passes `validateRecipe` from core on the device. The server validates too.
5. The account is optional and the app is fully usable as a guest. Deleting the account deletes the server data and revokes the
   Apple token. Safety answers and exception reasons never leave the device.
6. All UI text comes from `apps/mobile/src/copy/sr/<area>.ts` (one file per area, merged by `src/copy/sr/index.ts`;
   the area map is in COPY.md), in Montenegrin ijekavica and sentence case.
   - No ALL CAPS, emoji or "→" in labels.
   - Buttons say what they do.
7. Accessibility:
   - Touch targets are at least 44pt, and every icon button has an `accessibilityLabel`.
   - Respect Reduce Motion with Reanimated `useReducedMotion()`.
   - Layout survives Dynamic Type up to accessibility sizes.
8. Shipped UI has no lorem, TODO or bracket placeholders. Release is blocked while `[AI PROVAJDER]` or `[URL ...]` remain.
9. Never read or print real env files (`.env`, `.env.local`, `supabase/.env.local`) or keys (`*.p8`). `.env.example`
   files are fine and list every variable name. The Supabase service role key exists only inside edge functions.
   Production (`fastself-prod`, the ref in `.claude/prod-project-ref.txt`) is human-only; a hook blocks it.
10. Dev-only tools (demo date and time, reset) live behind `__DEV__` and never ship in production builds.
11. Dates are calendar dates in `Europe/Podgorica`. Use core's `DayNum` and `LocalDate` helpers, never `new Date()` math in UI.
12. Code runs on **both** iOS and Android. iOS is the release target this week, Android is used daily in development.
    Platform differences: Sign in with Apple only on iOS (`Platform.OS === 'ios'`; Android shows email only); glass
    falls back to a solid translucent fill on Android; never call iOS-only APIs without a platform check.
    `docs/PLATFORMS.md` §4 is the complete list; branch on `Platform.OS` only for those items.

## How to work (saves usage)
- **One task, one session.** Finish it, update `docs/PROGRESS.md` (max 3 lines), then `/clear`. Use `/rename` before clearing.
- **Plan mode** (Shift+Tab) for anything that touches more than 3 files. The model per task is in the PLAN.md task
  matrix: Sonnet by default, Opus only for T2 and T18 planning and the T24 audit.
- **Be specific.** Name files and functions. Do not scan the repo when this file or a doc says where things are.
- **Subagents** in `.claude/agents/`:
  - `rules-engine`: core logic and tests.
  - `ui-builder`: screens.
  - `supabase-backend`: SQL, RLS, functions.
  - `test-runner` (haiku): runs suites and returns only failures.
  - `appstore-auditor` (read-only): runs before release.
  - Use the subagent the task matrix names; the main session only delegates, reviews and commits.
  - Run at most two at once. Do not spawn a subagent for a one-file change: do it directly.
- **Skills**: `/verify` before every commit, `/new-screen`, `/supabase-change`, `/release-ios` (human-run), `fastself-domain`.
- **Expo plugin** (`expo@claude-plugins-official`) is enabled. Use its skills and MCP for SDK-correct APIs instead of guessing.
- **Test as you go.** Write the core test first, then the function, then the UI. While iterating run only the touched
  test file (`pnpm test:core -- rules/orthodox`); the full suites run once, through `/verify`.
- **Spend few tokens:**
  - Read only the doc section the task names. `grep -n` first, then read with offset and limit.
    Never read `docs/reference/prototype/Main.dc.html` or `docs/reference/engine.js` whole.
  - Do not re-read a file you just wrote or edited. Do not read `node_modules`, lockfiles, `ios/`, `android/`.
  - Never run `pnpm ios`, `pnpm android`, `pnpm start` or `expo start` yourself: they are long-running and print huge
    logs. Ask the human to run them in their own terminal and paste only the error. Check bundling with `pnpm typecheck`.
  - No web searches when a doc, the Expo plugin or the code already answers. After 2 failed attempts at the same error,
    stop and report what you tried instead of trying more variations.
  - Reports are at most 8 lines: what changed, tests, what the human should look at. Never paste code you wrote back
    into the chat.
- **Ask a human** before you change scope, change a design token, add a dependency outside the stack, or touch `eas submit`
  and production Supabase.

## Team (two people in parallel)
- **D = Danilo** (Mac + iPhone): design system, navigation, every screen except Plan, iOS checks, E2E, TestFlight.
  **A = Andrej** (Windows + Android): core, local DB + hooks, Supabase, AI, notifications, sync, Plan tab, report,
  delete and shopping sheets, Android checks. Full ownership and contracts: `docs/team/DANILO.md`, `docs/team/ANDREJ.md`.
- Edit only paths the task's owner owns. If you need a change in the other person's path, stop and write the request
  as "ZAHTJEV ZA <D|A>: ..." in your report.
- Contract first: code against the types in DOMAIN.md, API.md and the team files. If the other side is not merged yet,
  use the mock (`src/lib/api.mock.ts`, fixture settings) instead of waiting.
- Dependencies are added only by the owner of the area, in its own small PR. On a `pnpm-lock.yaml` conflict: take
  main's lockfile, run `pnpm install`, commit.

## Git
- Branch per task: `t/<task-id>-short-name`. Commit messages are imperative and in English.
- PR into `main`. CI must be green and one human approves.
- Never commit `.env*`, `supabase/.temp`, `ios/`, `android/` (CNG) or keys (`*.p8`).

## Compact instructions
When compacting, keep the current task id, the files changed, failing tests and their errors, and the decisions made.
Drop file contents already written and long logs.
