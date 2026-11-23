# Testing: everything, at every layer

Every piece of logic has a unit test, every screen has a behaviour test, every risky flow has an E2E test, and every
release passes the device QA matrix and the accuracy check against official sources.

## 1. Layers and where they run
| Layer | Tool | Where | When |
|---|---|---|---|
| Types, lint | tsc strict, eslint | terminal, CI | every commit (`/verify`) |
| Core logic | Vitest (+ fast-check for properties) | terminal, CI | every commit |
| App behaviour | Jest + jest-expo + @testing-library/react-native | terminal, CI | every commit touching apps/mobile |
| DB and RLS | pgTAP via `supabase test db` (local Docker) | terminal, CI job `db` | every migration change |
| Edge functions | `deno test` with mocked fetch, plus curl against `supabase functions serve` | terminal, CI | every function change |
| E2E | Maestro on iOS Simulator (dev build, local Supabase) | Mac | daily, plus before every build |
| Device QA | TestFlight build on the iPhone; Android smoke list (PLATFORMS.md §8) on Andrej's phone | phones | before every submission |
| Accuracy | humans vs church calendar and IZ CG vaktija | paper/screenshots | once per rule-pack change |
| Store compliance | `appstore-auditor` subagent + APPSTORE.md checklist | Claude + human | before every submission |

## 2. Commands
```
pnpm test:core                        # Vitest run; add --coverage for the report (thresholds in vitest.config.ts)
pnpm test:app                         # Jest; add -- --watch while developing
supabase start && supabase db reset && supabase test db
deno test --allow-env --allow-net=127.0.0.1 supabase/functions
pnpm ios                              # dev build in the Simulator (iPhone 18 Pro)
maestro test e2e/maestro              # all flows; maestro test e2e/maestro/01-onboarding.yaml for one
maestro studio                        # inspect testIDs interactively
```
Coverage thresholds: core is at least 90% lines on rules, plan and meals, and at least 80% overall. The app has no
percentage target, but every screen has at least one behaviour test.

## 3. Golden data (hard-code these in `packages/core/test/golden/*.ts`)

### 3.1 Orthodox Easter (Gregorian dates)
2020-04-19, 2021-05-02, 2022-04-24, 2023-04-16, 2024-05-05, 2025-04-20, 2026-04-12, 2027-05-02, 2028-04-16, 2029-04-08,
2030-04-28, 2031-04-13, 2032-05-02, 2033-04-24, 2034-04-09, 2035-04-29, 2036-04-20, 2037-04-05, 2038-04-25, 2039-04-17,
2040-05-06.

### 3.2 Orthodox day rules (strictness `voda`)
These were checked against the rules in DOMAIN.md §2. A must also confirm them against the church calendar.
| Date | Wd | Level | Reasons (in order) |
|---|---|---|---|
| 2026-11-27 | Fri | voda | Petak |
| 2026-11-28 | Sat | riba | Božićni post |
| 2026-12-02 | Wed | voda | Božićni post (ulje), Srijeda (voda) |
| 2026-12-04 | Fri | riba | Božićni post, Petak, Vavedenje (riba) |
| 2026-12-19 | Sat | riba | Božićni post |
| 2027-01-01 | Fri | voda | Božićni post, Petak |
| 2027-01-02 | Sat | ulje | Božićni post (weekend after 1.1.) |
| 2027-01-06 | Wed | voda | Badnji dan (one-day, no Wed reason) |
| 2027-01-07 | Thu | mrsno | Svjatki |
| 2027-01-13 | Wed | mrsno | Svjatki (Wednesday ignored) |
| 2027-01-18 | Mon | voda | Krstovdan |
| 2027-01-19 | Tue | mrsno | Bogojavljenje |
| 2027-01-20 | Wed | voda | Srijeda |
| 2027-03-01 | Mon | mrsno | Običan dan |
| 2027-03-10 | Wed | bezmesa | Bijela sedmica (Wednesday ignored) |
| 2027-03-15 | Mon | voda | Veliki post (day 1 of 48) |
| 2027-03-20 | Sat | ulje | Veliki post |
| 2027-04-07 | Wed | riba | Veliki post, Srijeda, Blagovijesti |
| 2027-04-25 | Sun | riba | Veliki post, Cvijeti |
| 2027-05-01 | Sat | ulje | Veliki post (Velika subota) |
| 2027-05-02 | Sun | mrsno | Svijetla sedmica |
| 2027-05-05 | Wed | mrsno | Svijetla sedmica |
| 2027-06-23 | Wed | mrsno | Trojičina sedmica |
| 2027-06-28 | Mon | ulje | Petrovski post (day 1 of 14) |
| 2027-06-30 | Wed | voda | Petrovski post, Srijeda |
| 2027-07-03 | Sat | riba | Petrovski post |
| 2027-07-11 | Sun | riba | Petrovski post (last day) |
| 2027-07-12 | Mon | mrsno | Običan dan |
| 2027-08-14 | Sat | ulje | Gospojinski post |
| 2027-08-19 | Thu | riba | Gospojinski post, Preobraženje |
| 2027-08-27 | Fri | voda | Gospojinski post, Petak |
| 2027-09-11 | Sat | voda | Usekovanje |
| 2027-09-27 | Mon | voda | Krstovdan (Vozdviženje) |

Strictness cases:
- `ulje` on 2026-12-02 gives ulje, with the extra reason "Tvoja mjera posta".
- `riba` on 2027-03-15 gives riba.
- `riba` on 2027-03-10 gives bezmesa (unchanged).

Period sizes:
- 2026: Petrovski is 34 days, 2026-06-08 to 07-11.
- 2027: Petrovski is 14 days; Veliki post is 2027-03-15 to 05-01; Bijela sedmica is 03-08 to 03-14.

### 3.3 Prayer times, Podgorica, MWL, engine output (±1 min; adhan should match)
| Date | fajr | sunrise | dhuhr | asr | maghrib | isha |
|---|---|---|---|---|---|---|
| 2026-12-02 | 05:13 | 06:53 | 11:32 | 13:52 | 16:11 | 17:46 |
| 2027-02-08 | 05:14 | 06:49 | 11:57 | 14:41 | 17:06 | 18:35 |
| 2027-03-09 | 04:33 | 06:06 | 11:54 | 15:07 | 17:42 | 19:10 |
| 2027-03-27 (last winter day) | 03:59 | 05:35 | 11:48 | 15:19 | 18:03 | 19:33 |
| 2027-03-28 (summer time) | 04:57 | 06:33 | 12:48 | 16:19 | 19:04 | 20:34 |
| 2027-06-21 | 02:51 | 05:06 | 12:45 | 16:49 | 20:24 | 22:28 |
| 2027-10-31 (winter again) | 04:40 | 06:15 | 11:27 | 14:13 | 16:38 | 18:07 |
IZ CG method: after A calibrates the offsets, add a test per collected official date with a tolerance of ±2 min.

### 3.4 Hijri (tabular, shift 0)
- 1 Ramadan: 1446 → 2025-03-01, 1447 → 2026-02-18, 1448 → 2027-02-08, 1449 → 2028-01-28.
- 1 Shawwal 1448 → 2027-03-10. Arafah 1448 → 2027-05-16. Ashura 1448 → 2026-06-26.
- 2026-12-02 → 21 džumadel-uhra 1448. 2027-02-07 → 29 šaban 1448.
- With shift +1: 1 Ramadan 1448 → 2027-02-09.

### 3.5 Day plan combinations (city Podgorica, MWL, offsets 0)
| Case | Expect |
|---|---|
| orthodox + IF16, 2026-12-02 | level voda, window 12:00–20:00 (if), title "Post na vodi", sub "Božićni post, 5. dan od 40" |
| ramadan + IF16, 2027-02-08 | window start 17:06, end 01:06 (+1 day), ifInside true; title "1. ramazan" |
| ramadan only, 2027-02-08 | window 17:06 → 05:14 next day |
| ramadan + exception, 2027-02-08 | no window, title "Danas ne postiš", sub "1. ramazan, dan za naknadu", kaza = 1 |
| nafila suggested Mon 2026-11-23, not chosen | title "Danas nema posta", sub "Dobrovoljni post je moguć: ponedjeljak, sunnet post" |
| nafila chosen | window fajr→maghrib, title "Dobrovoljni post" |
| IF only 14:10 | window 10:00–20:00, title "IF 14:10" |
| minor + IF on | ifH = 0, no window |
| orthodox off, ramadan on, 2026-12-02 | no Orthodox reasons; Ramadan countdown 68 days to 2027-02-08 |

### 3.6 Validator (meals)
- voda day: "Posna sarma" is rejected with the reason naming step 2 (oil); "Rižoto sa pečurkama" passes
  ("bez ulja" is ignored); "Humus" is rejected (oil, step 2).
- riba day (4.12.): "Riblja čorba" passes; "Piletina" is rejected (meso, step 1).
- Allergy orasasto: "Salata od kupusa i oraha" is rejected with the allergy reason.
- Custom "kivi": any recipe containing "kivi" is rejected.
- Halal: anything with svinj… or vino/rakija is rejected.
- Vegan: med is rejected.
- Property (fast-check): for every random recipe and level, if `validateRecipe` returns [], no FORBID category appears in
  the cats or the keyword matches.

### 3.7 Sky, moon, slava, plurals
- Sun altitude 2026-12-02, Podgorica: 06:54 is about −0.8°, 12:00 is 25.3° ±0.3, 16:11 is about −0.8°.
- Moon: 2026-12-09 mladi mjesec; 2026-12-24 pun mjesec; 2027-02-06 mladi mjesec; 2027-02-20 pun mjesec.
- nextSlava(2027-01-07, jovan): 13 days, level voda (Wednesday).
- nextSlava(2026-12-02, nikola): 17 days, riba.
- Plural `fsPl`: 1 namirnica, 2 namirnice, 5 namirnica, 11 namirnica, 21 namirnica, 22 namirnice.

## 4. App behaviour tests (Jest + RNTL, `apps/mobile/src/**/__tests__`)
Mock: expo-notifications, expo-location, expo-apple-authentication, supabase (`jest.mock('../lib/supabase')`),
and the clock (`jest.useFakeTimers().setSystemTime(...)` plus the core clock injection).
- **Onboarding:**
  - Cannot continue without a practice.
  - The minor toggle disables IF.
  - Choosing orthodox reveals strictness and slava.
  - Dozvole hides location when no Islamic practice.
  - Skip account lands on Danas with settings saved.
- **Danas:** for each §3.5 row, the title, sub, countdown label and the plate chips are correct.
  - Allergies appear in "Ne može" with a note.
  - The Zašto receipt lists reasons in order.
  - The exception sheet sets "Danas ne postiš".
- **Kalendar:**
  - Dec 2026 has 31 cells after 1 blank (Tue start).
  - Selecting 4.12 shows Vavedenje.
  - Next goes to Jan 2027, and Danas returns.
- **Plan:** 7 and 30 counts match `rangeStats`; the meal plan button asks for consent first.
- **Tajmer:**
  - Start schedules one notification; stop cancels it.
  - Elapsed formatting; the early stop message.
- **Asistent:**
  - The built-in list shows only validated recipes.
  - A mocked AI response containing a forbidden recipe never renders it and shows it under "Provjera je odbila".
  - Offline shows the fallback text and built-in recipes.
- **Profil:**
  - AI switch on opens consent; off writes a consent row false.
  - Delete when logged out wipes the DB and routes to welcome.
- **Auth:**
  - Apple success calls signInWithIdToken with the nonce.
  - OTP flow states, and error texts.
- **Sync:** the outbox only fills with consent; push and pull merge LWW; turning a consent off stops the push.
- **Copy:** a test greps `src/` for `[AI PROVAJDER]`, `[URL`, `TODO`, `lorem` and fails if any are found in shipped files.

## 5. Database tests (pgTAP, `supabase/tests/*.sql`)
- `001_schema.sql`: tables exist; RLS is enabled on every public table (`select relrowsecurity`).
- `002_rls_own_rows.sql`:
  - Create users A and B (`auth.users` inserts), and set `request.jwt.claims` to A.
  - A can insert and select its rows.
  - A cannot select, update or delete B's rows (expect 0 rows or an error).
  - Anon cannot select any user table.
- `003_consents_append_only.sql`: update and delete are denied for authenticated.
- `004_reports.sql`: anon can insert with user_id null; anon cannot select; message length constraints.
- `005_delete_cascade.sql`: deleting A in auth.users removes all A rows; A's reports keep the row with user_id null.
- `006_private_schema.sql`: anon and authenticated cannot read private.apple_tokens or private.ai_usage.

## 6. E2E flows (Maestro, `e2e/maestro/`)
Prerequisites:
- A dev build is running on the "iPhone 18 Pro" Simulator.
- `supabase start` is running, with the app pointed at local Supabase (`EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`).
- The dev menu's demo clock is set through the deep link `fastself://dev?date=2026-12-02&time=16:30`.
Flows:
1. `01-onboarding.yaml`: welcome, pick orthodox + IF16, strictness ulje, slava Nikola, add allergen "kivi", safety off,
   skip permissions, skip account; assert Danas title "Post na ulju".
2. `02-danas-why.yaml`: tap `btn-why`, assert "Važi za danas" and the reason rows; tap report, type a message, send, and
   assert the toast.
3. `03-kalendar.yaml`: next month, tap 7.1.2027, assert "Mrsno"; back to today.
4. `04-asistent-ours.yaml`: open Šta da jedem, assert at least 1 recipe card, expand it, assert steps visible.
5. `05-ai-consent.yaml`: switch to the AI tab, generate, assert the consent sheet, allow, then assert results or the
   fallback text (the local function uses `AI_PROVIDER=mock`).
6. `06-account-email.yaml`:
   - Profil, then sign in, then email `e2e+<ts>@test.local`, then send the code.
   - Fetch the OTP from Mailpit with `runScript` (`http://127.0.0.1:54324/api/v1/messages`) and enter it.
   - Enable sync, then assert "Sinhronizacija uključena".
7. `07-delete-account.yaml`: continue from 06, then Profil, then delete; assert logged out, then check that the user is
   gone (a script calls the admin endpoint locally).
8. `08-tajmer.yaml`: switch the plan to 14:10, start, assert the running state, stop, and assert the message.
9. `screenshots.yaml`: 6 screens at 4 dates and times, each followed by `takeScreenshot` into `store/screenshots/`.
Example:
```yaml
appId: ai.fastself.app
---
- openLink: "fastself://dev?reset=1&date=2026-12-02&time=16:30"
- tapOn: { id: "btn-start" }
- tapOn: { id: "choice-orthodox" }
- tapOn: { id: "seg-strog-ulje" }
- tapOn: { id: "choice-if" }
- tapOn: { id: "btn-next" }
- assertVisible: "Alergije i ishrana"
```
The `fastself://dev` deep link is handled only in `__DEV__` builds.

## 7. Edge function tests (Deno)
- meal-suggest:
  - The schema rejects extra keys and long strings; the rate limit returns 429 on the 21st call.
  - A provider returning 1 bad + 2 good recipes gives 2 recipes and 1 rejected.
  - All bad recipes give a retry, then `fallback: true`.
  - A provider timeout gives fallback.
- apple-token: the JWT has the correct header and claims (ES256, kid); the Apple error is handled.
- delete-account: no JWT gives 401; with an Apple row, revoke is called once; deleteUser is called.
- Use the `AI_PROVIDER=mock` provider (returns fixtures) for local E2E.

## 8. Device QA matrix (TestFlight build on Danilo's iPhone, plus an Android smoke test on Andrej's phone; log in docs/QA-LOG.md)
For each row tick ✅ or file a bug. The dev clock is not available in TestFlight, so use real "today" plus the Kalendar for
other dates.
- [ ] First launch and onboarding in under 90 s; every step back and forward works; nothing is cut off on the smallest device.
- [ ] Danas is correct today for orthodox, ramadan-countdown and IF; the countdown ticks; the sky matches the time of day.
- [ ] Kalendar: Božićni post Dec 2026 colours; 4.12 riba; 6.1 voda; 7.1 mrsno; slava star 19.12.
- [ ] Vaktija: Podgorica zora and akšam match IZ CG within ±2 min; changing the city changes the times; offsets apply.
- [ ] Notifications:
  - The evening-before reminder arrives at 20:00 (set a fast day tomorrow).
  - The IF end notification arrives with the app killed.
  - Tapping a notification opens the right screen.
- [ ] Permissions denied (location, notifications): the app still works, with clear text and no repeated prompts.
- [ ] Airplane mode: everything works except AI, sync and login, each with a clear message.
- [ ] AI: consent appears once and the result is compliant. Switching AI off in Profil means no more calls (check the Supabase logs).
- [ ] Sign in with Apple on a device: works, with the hidden email shown correctly.
- [ ] Email OTP: the code arrives (check spam), and an expired or wrong code shows an error.
- [ ] Sync: change practices on phone A, foreground phone B, and they update. Turn a consent off and the server copy is deleted
  when asked.
- [ ] Export: the JSON opens in Files and contains the data.
- [ ] Delete account:
  - It is gone in the Supabase dashboard.
  - The Apple ID shows the app removed (Settings → Apple ID → Sign in with Apple).
  - Signing in again creates a fresh account.
- [ ] Accessibility:
  - VoiceOver through Danas, Kalendar and onboarding.
  - Dynamic Type xxxLarge.
  - Reduce Motion and Reduce Transparency.
  - Bold Text.
- [ ] Interruptions: background and foreground during OTP; an incoming call during onboarding; low power mode; a time zone
  change (the travel case shows Podgorica times, as designed).
- [ ] Performance: cold start under 2 s to Danas on an iPhone 12 or newer; scrolling has no dropped frames (Instruments
  optional); memory is stable after 10 min.
- [ ] Copy: no typos, ijekavica, no English leftovers, no placeholders.

## 9. Accuracy verification (humans, before each submission)
- A compares Kalendar levels for Dec 2026, Jan 2027 and Mar–May 2027 with the church calendar photos in
  `docs/reference/sources/`. Log the differences, then fix `orthodox.v0.1.json`, bump to v0.2 and add a golden test row
  for each fix.
- A compares 5 Vaktija dates with IZ CG and adjusts the `izcg` offsets.
- Both read every Ramadan string with someone who fasts Ramadan, and every Orthodox string with someone who keeps the fasts.
- Flag anything unsure in the why receipt as "provjeri sa sveštenikom/imamom" rather than guessing.

## 10. Pre-release gates (all must pass before `eas build --profile production`)
1. `pnpm typecheck && pnpm lint && pnpm test:core && pnpm test:app` are green; `supabase test db` and `deno test` are green.
2. Maestro flows 01–08 are green on the Simulator.
3. The `appstore-auditor` subagent reports 0 blockers.
4. No placeholders (the copy test passes) and the AI provider is named everywhere.
5. The privacy policy and support URLs return 200 and match the app; `fastself-site` contains no `[POPUNI`.
6. `version` is 1.0.0, EAS auto-increments the build number, `eas env:list --environment production` shows the prod
   Supabase URL and key; the changelog is in docs/PROGRESS.md.
7. Prod Supabase uses custom SMTP; an OTP to a fresh Gmail and iCloud address arrives within a minute.
8. Prod edge function secrets are set (`supabase secrets list --project-ref <prod>`): AI key, Apple key id, team id,
   client id, private key.

## 11. Bug reports
Use the template and the S1/S2/S3 severities in `docs/QA-LOG.md`. S1 blocks the release: a crash, data loss, a wrong
religious rule or time, an allergen shown as allowed, or a review blocker.
