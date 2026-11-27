# E2E (Maestro)

Prerequisites: Simulator "iPhone 18 Pro" booted, the dev build installed and running (`pnpm ios`), `supabase start`, and
`apps/mobile/.env.local` pointing at `http://127.0.0.1:54321` (works from the iOS Simulator; see PLATFORMS.md §3).
Maestro runs on the iOS Simulator only (D's Mac). Android is checked by hand (PLATFORMS.md §8).

Run: `maestro test e2e/maestro` (all) or `maestro test e2e/maestro/01-onboarding.yaml` (one).
Run with a timestamp (06 and 07 need it, 07 continues from 06): `maestro test -e MAESTRO_TS=$(date +%s) e2e/maestro`.
Inspect ids: `maestro studio`.

Flows (TESTING.md §6): 01 to 08 and screenshots.yaml. v1 hides AI, so 04 checks the terms and privacy screens and 05
the rating instead of Šta da jedem and the AI consent. 06 signs up with email + password.
The `fastself://dev` link works only in `__DEV__` builds.
