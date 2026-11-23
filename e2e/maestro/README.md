# E2E (Maestro)

Prerequisites: Simulator "iPhone 17" booted, the dev build installed and running (`pnpm ios`), `supabase start`, and
`apps/mobile/.env.local` pointing at `http://127.0.0.1:54321` (works from the iOS Simulator; see PLATFORMS.md §3).
Maestro runs on the iOS Simulator only (D's Mac). Android is checked by hand (PLATFORMS.md §8).

Run: `maestro test e2e/maestro` (all) or `maestro test e2e/maestro/01-onboarding.yaml` (one).
Run 06 with a timestamp: `maestro test -e MAESTRO_TS=$(date +%s) e2e/maestro/06-account-email.yaml`.
Inspect ids: `maestro studio`.

Flows (TESTING.md §6): 01-onboarding, 06-account-email and screenshots.yaml are written; T21 adds 02–05, 07 and 08.
The `fastself://dev` link works only in `__DEV__` builds.
