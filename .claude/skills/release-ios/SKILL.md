---
name: release-ios
description: Human-run checklist for a TestFlight or App Store release of fastself.ai. Prepares and verifies; the human runs eas build and eas submit in their own terminal.
disable-model-invocation: true
argument-hint: "[testflight | appstore]"
---

# Release iOS: $ARGUMENTS

You prepare and verify. The human runs every command marked **HUMAN** in their own terminal (a hook blocks
`eas submit` for Claude). Stop at the first red item and say what to fix.

## 1. Gates (TESTING.md §10)
1. Run `/verify all`. Must end with READY TO COMMIT.
2. Ask the human to run Maestro flows 01–08 on the Simulator (`maestro test e2e/maestro`) and paste the summary line.
3. Run the `appstore-auditor` subagent. 0 blockers, or stop.
4. Grep for placeholders: `[AI PROVAJDER]`, `[URL`, `[POPUNI`, `TODO` in `apps/mobile/src`, `app.config.ts`.
5. Check `version` is `1.0.0` in `npx expo config --type public` and that `eas.json` has `appVersionSource: "remote"`
   and `autoIncrement: true` in production (EAS raises the build number; never edit it by hand). Ask the human to run
   `eas env:list --environment production` and confirm both `EXPO_PUBLIC_SUPABASE_*` point at prod.
6. Add a changelog line at the top of the Log in `docs/PROGRESS.md`.
7. Commit on a branch `release/1.0.0-<build>` and ask the human to open the PR and merge after CI.

## 2. Production backend (A, once, before the first TestFlight build) **HUMAN**
```
supabase link --project-ref <prod-ref>
supabase db push
pnpm build:edge
supabase functions deploy meal-suggest meal-plan apple-token delete-account health
supabase secrets set AI_PROVIDER=anthropic ANTHROPIC_API_KEY=... HASH_SALT=... \
  APPLE_TEAM_ID=... APPLE_KEY_ID=... APPLE_CLIENT_ID=ai.fastself.app APPLE_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)"
```
Dashboard: Auth → Providers → Apple on (client id `ai.fastself.app`); Auth → Emails → custom SMTP; OTP length 6.
Then `curl https://<prod-ref>.supabase.co/functions/v1/health` returns `{ ok: true }`.

## 3. Build and upload **HUMAN**
```
cd apps/mobile
eas build -p ios --profile production        # or add --local to build on this Mac without quota
eas submit -p ios --latest
```
Wait for the email "has completed processing" (10–30 min).

## 4. TestFlight
- Internal group: add both team members (Andrej has Android, so only Danilo installs); run the QA matrix (TESTING §8), log in `docs/QA-LOG.md`.
- External group "Mentori" (if $ARGUMENTS is testflight): add the build, fill "What to test" from APPSTORE.md §8,
  submit for Beta App Review, share the public link when approved.

## 5. App Store (if $ARGUMENTS is appstore)
- App Store Connect → the app → iOS App 1.0 → Build: select the build.
- Check metadata, screenshots (6.9"), privacy labels, age rating, review notes (APPSTORE.md §4–§7).
- **Submit for Review**. Release option: "Manually release this version" so you choose the moment.
- Watch email and App Store Connect. If rejected: APPSTORE.md §9, reply in the Resolution Center the same day.
