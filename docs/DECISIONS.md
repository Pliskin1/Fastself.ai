# Decisions

Short records. Change one only with both humans agreeing; add a new row instead of editing history.
Status: **fixed** (do not revisit this week), **open** (a human decides on Day 0), **later** (v1.1).

| id | decision | why | status |
|---|---|---|---|
| D-01 | Expo SDK 58, New Architecture, Expo Router, TypeScript strict | Latest stable SDK, native tabs and sheets, one codebase for a later Android release | fixed |
| D-02 | One codebase for iOS and Android (Expo). This week only the iOS App Store release; Android runs in development (A tests on his Android phone) and goes to Google Play in v1.1. iPhone only on iOS (`supportsTablet: false`) | The deadline is Apple's. Google Play: new personal developer accounts must run a closed test with at least 12 testers for 14 days before production, so Play cannot ship this week anyway. iPad would need its own screenshots and layout QA | fixed |
| D-03 | Local-first: SQLite is the source of truth on the device; the account is optional | Works offline, fewer review issues (5.1.1(v)), privacy by default | fixed |
| D-04 | Accounts with Supabase Auth: Sign in with Apple (native) plus email OTP. No Google login | Mentors require accounts and a database. Apple plus first-party email satisfies 4.8 without extra providers | fixed |
| D-05 | `packages/core` is pure TS and the single source of rules; the edge functions get a bundled subset (`pnpm build:edge`, esbuild) | Deno cannot import the pnpm workspace; one implementation means the server and device validators cannot drift | fixed |
| D-06 | Rules are data: `orthodox.v0.1.json` plus code for movable dates; the rule pack version is shown in the UI | Corrections without code changes; transparency in the why receipt | fixed |
| D-07 | AI provider: Anthropic `claude-haiku-5-5` through forced tool use; Cloudflare Workers AI as a fallback behind the same interface (`AI_PROVIDER`) | Reliable structured output, cheap, EU data terms available. The consent text names the provider, so a change needs a new build and a policy update | **open**: confirm on Day 0 |
| D-08 | AI never sees personal data; payload = forbidden categories, avoid words, meal, chosen ingredients, locale | 5.1.2(i), GDPR data minimisation, and religion is special-category data | fixed |
| D-09 | Every recipe is validated twice: on the server before returning and on the device before showing | The model can be wrong; allergies are a safety issue | fixed |
| D-10 | Safety answers and exception reasons are stored only on the device, never synced | Health data minimisation; nothing to leak | fixed |
| D-11 | Sync is last-write-wins per row with `updated_at`, an outbox on the device, and consent per data group | Simple, enough for one user on two phones; conflicts are rare | fixed |
| D-12 | Public AI endpoint protected by a random install id (hashed) rate limit plus a per-user limit when logged in | Guests can use AI without an account; costs stay capped | fixed |
| D-13 | Prayer times computed locally with `adhan`. IZCG method = MWL angles plus per-prayer minute offsets calibrated from the official vaktija | No network needed; the official tables are the reference | fixed (offsets **open** until A calibrates) |
| D-14 | Islamic dates: tabular Hijri with a user shift of ±1 day for the start of Ramadan | Moon sighting differs by authority; the user follows their own jamaat | fixed |
| D-15 | Mjera posta (strictness cap: voda, ulje, riba) lowers the shown level, never raises it | People follow their priest's guidance; the app must not be stricter than they chose | fixed |
| D-16 | IF is blocked for under-18s; the religious calendar stays available | Safety; App Store 1.4.1 | fixed |
| D-17 | Native tabs (`expo-router/native-tabs`) instead of the prototype's custom gold tab bar | Liquid Glass for free on iOS 26, accessibility, less code. The prototype tab bar is a visual reference only | fixed |
| D-18 | Liquid Glass through `expo-glass-effect` where available, `expo-blur` fallback | The design depends on glass; older iOS must still look right | fixed |
| D-19 | Motion with Reanimated 4 (CSS-style transitions and shared values); respect Reduce Motion everywhere | Performance on the UI thread; accessibility | fixed |
| D-20 | Notifications are local only (expo-notifications), max 60 scheduled, rescheduled on launch and on settings change | No push server needed; iOS keeps 64 pending | fixed |
| D-21 | Location is used once to pick the nearest city; coordinates are discarded | Data minimisation; App Privacy says "Location: not collected" | fixed |
| D-22 | Supabase region eu-central-1 (Frankfurt); two projects, dev and prod | GDPR; production keys never on dev machines' day-to-day work | fixed |
| D-23 | Builds: local `npx expo run:ios` for development; EAS Build only for TestFlight and App Store (free plan: 15 iOS builds/month) | Speed and quota | fixed |
| D-24 | Store language: English (U.S.) primary plus Croatian localisation; the UI is Montenegrin only | App Store Connect may not offer Montenegrin or Serbian localisation; Croatian is closest | **open**: check in ASC |
| D-25 | Apple team: the Coinis organisation, or one of the developers' individual accounts | Organisation enrolment needs a D-U-N-S number, which takes days | **open**: Day 0 |
| D-26 | Legal pages on GitHub Pages from a separate public repo `fastself-site` | Free, fast, stable URLs; the main repo stays private | fixed |
| D-27 | English UI, widgets, Live Activity, Android store release, remote rule-pack updates | Not needed for review | later |
| D-29 | Email sender for OTP in prod: custom SMTP (Resend with an owned domain, or Brevo with a verified sender) | The built-in Supabase mailer does not deliver to outside addresses | **open**: Day 0 |
| D-28 | Bundle id `ai.fastself.app`, scheme `fastself` | Matches the domain; cannot be changed after the first upload | **open**: confirm before T1 |

## How to add a decision
Append `| D-NN | what | why | status |`. If it changes a doc, change that doc in the same commit and mention the id.
