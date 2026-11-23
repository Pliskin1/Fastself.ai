# Danilo: plan za 23.–27.11.

Ti praviš sve što korisnik vidi i dodiruje: dizajn sistem, navigaciju, onboarding, Danas, Kalendar, Tajmer, Profil,
Šta da jedem i prijavu. Ti si jedini sa Macom i iPhoneom, pa su tvoji i Simulator, Maestro E2E, TestFlight build i
App Store screenshotovi. Andrej pravi mozak i server aplikacije (pravila posta, lokalna baza, Supabase, AI,
notifikacije, sync, brisanje naloga), Plan tab i tri sheeta, i sve provjerava na Androidu. Posao je podijeljen na
oko 33 h svakome (sa petkom). Radite istovremeno, svako u svojim folderima, i spajate se dva puta dnevno. Kad ti treba nešto od
Andreja, a on to još nije spojio, radiš sa mockom (lažnim podacima istog oblika) i ne čekaš.

## Tvoja sedmica
| Dan | Ti radiš | Spajaš do | Andrej ti daje |
|---|---|---|---|
| Pon | T1 scaffold (13:15–14:30), T3 dizajn sistem + ikonice (14:30–18:30) | ⚡ T1 u 14:30 (Andrej čeka), T3 u 18:30 | T2 core (veče) |
| Uto | T5 navigacija (9:15–10:15), T6 onboarding (10:15–13:00), T7 Danas (14:00–18:00) | ⚡ T5 u 10:15, T6 u 13:00, T7 u 18:00 | T4 hookovi u 11:00 |
| Sri | T8 Kalendar (9–11), T13 Profil (11–14), T12 Tajmer (14–17) | T8 u 13:00, T13 + T12 u 18:00 | T15 notifikacije u 11:00, T14 api u 13:00 |
| Čet | T14 UI (9–10:30), T17 auth UI (10:30–12), T20 animacije (12–14), T21 E2E (14–16), T22 TestFlight (17:00) | sve do 16:00 | T17 backend u 10:30, prod backend u 17:00 |
| Pet | T25 screenshotovi, T23 iOS bugovi, T27 submit sa Andrejem | do 15:00 | T24 audit, T26 metapodaci |
⚡ = spoji odmah, ne čekaj termin, jer Andrej čeka na to.

## Zajednički ritam
- **09:00** dogovor 10 min: šta je spojeno, šta danas, šta blokira.
- **13:00 i 18:00** spajanje: oba otvorite PR-ove, pregledate jedan drugom (5–10 min), merge, `git pull`. Zatim ti
  pokreneš aplikaciju na iPhoneu i otvoriš Andrejeve ekrane (Plan, sheetove), a on tvoje na Androidu. Greške upišite u
  `docs/QA-LOG.md`.
- Poslije merge-a: `/clear` i novi zadatak u novoj grani.
- Ti ažuriraš samo svoj blok u `docs/PROGRESS.md` (D blok) i "Now" u 18:00.

## Pravila da se ne sudarate
- Diraš samo svoje putanje (lista ispod). Ako ti treba izmjena kod Andreja, Claude će napisati "ZAHTJEV ZA A: ...":
  pošalji mu to, ne mijenjaj sam.
- Pakete dodaješ samo za svoj dio i u posebnom malom PR-u. Ako `pnpm-lock.yaml` ima konflikt: uzmi verziju iz `main`,
  `pnpm install`, commit.
- Mali PR-ovi (jedan zadatak). PR bez zelenog CI-ja se ne spaja.

---

# Za Claude Code (D sessions)

You are working with **Danilo (D)** on a **Mac with an iPhone**. He runs the iOS Simulator and the iPhone; Andrej (A)
works in parallel on Windows with an Android phone. Follow CLAUDE.md. This section lists what D owns, what he provides
to A, what he consumes from A, and the prompt for each of his tasks. The human pastes one prompt per session.

## D owns (edit only these)
- `apps/mobile/app.config.ts`, `apps/mobile/eas.json`, `apps/mobile/assets/**`, `scripts/icons.mjs`
- `apps/mobile/src/app/**` **except** `(tabs)/plan.tsx`, `(sheets)/prijava-greske.tsx`, `(sheets)/brisanje.tsx`,
  `(sheets)/kupovina.tsx` (A owns those after T5 creates them as stubs)
- `apps/mobile/src/components/**`, `src/theme/**`, `src/features/**` except `src/features/plan/**`,
  `src/features/report/**`, `src/features/brisanje/**`, `src/features/dev/sections/notifications.tsx`
- `apps/mobile/src/copy/sr/{index,common,onboarding,nalog,danas,kalendar,tajmer,profil,asistent}.ts`
- `apps/mobile/src/config.ts` (A sends the legal URLs), `e2e/**`, `store/screenshots/**`, D block of `docs/PROGRESS.md`
- Root config from T1 (`package.json`, `tsconfig.base.json`, `eslint.config.mjs`) until T1 is merged; afterwards
  changes there need a note to A in the PR.

## D provides to A (keep these names stable; A builds on them)
| What | Where | By |
|---|---|---|
| Monorepo, app shell, `@fastself/core` wiring | T1 | Mon 14:30 ⚡ |
| Theme tokens `src/theme`, fonts | T3 | Mon 18:30 |
| Components: `Display`, `Title`, `Body`, `Caption`, `GlassCard`, `GlassChip`, `PrimaryButton`, `SecondaryButton`, `LinkButton`, `IconButton`, `Switch`, `Segmented`, `Choice`, `Chip`, `Pill`, `Icon`, `ScreenScroll`, `KeyboardScreen`, `SkyBackground`, `useToast()`, `useMotion()`, `haptics` | `src/components` (haptics in `src/components/haptics.ts`) | T3, Mon 18:30 |
| Route stubs for every route in SCREENS.md §0, including A's `(tabs)/plan`, `(sheets)/prijava-greske`, `brisanje`, `kupovina` (each renders `ScreenScroll` with `testID` and nothing else) | `src/app/**` | T5, Tue 10:15 ⚡ |
| Dev screen that renders `src/features/dev/sections/notifications.tsx` (stub `export default () => null`, A fills it) | `src/app/dev.tsx` | T5 |
| Deep link listener for `fastself://dev?...` that calls A's `applyDevLink(url)` | `src/app/_layout.tsx` | T5 |
| Shared `PraksePicker` and `AlergijePicker` components (onboarding and Profil) | `src/features/onboarding/` | T6, Tue 13:00 |
| Profil rows that open A's screens: export row calls `exportData()`, delete row pushes `/(sheets)/brisanje` | `src/features/profil` | T13, Wed 18:00 |
| Report entry points: `router.push({ pathname: '/(sheets)/prijava-greske', params: { date: 'YYYY-MM-DD', context: 'danas'|'kalendar'|'profil'|'recipe', recipeId? } })` | Danas, Kalendar, Profil, Asistent | T7, T8, T13, T14 |

## D consumes from A (use the mock or fixtures until it is merged)
| What | Signature | Merged by | Until then |
|---|---|---|---|
| core | `dayPlan(n, settings)`, `rangeStats`, `nextSlava`, `forbiddenFor`, `validateRecipe`, `skyColors`, `sunAltitude`, `moonPhase`, `pl`, `toDayNum`, `fromDayNum`, types `Settings`, `DayPlan`, `FoodLevel` (DOMAIN.md) | Mon night | T3 uses only `skyColors`; wait for T2 merge before T7 |
| hooks | `useSettings(): Settings`, `useUpdateSettings(): (patch: Partial<Settings>) => void`, `useNow(): { now: SharedValue<number>; minute: number }`, `useToday(): DayNum`, `useDayPlan(n?: DayNum): DayPlan` | Tue 11:00 | T6 builds layout first, wires the store after 11:00 |
| test utils | `@/test/utils`: `withProviders(el, { settings, now })`, `fixtureSettings(patch)`, `at('2026-12-02T16:30')` | Tue 11:00 | — |
| repos | `fastingSessions.start(planH) / stop() / current() / last7()`, `dayMarks.setException(n, reason) / clear(n)`, `consents.set(kind, on) / get(kind)` | Tue 11:00 | — |
| permissions | `ensureNotificationPermission(): Promise<boolean>` (Android channel included), `nearestCity(): Promise<CityId \| null>` | Tue 11:00 | — |
| notifications | `scheduleIfEnd(endsAtMs)`, `cancelIfEnd()`, `rescheduleAll()` | Wed 11:00 | T12 starts at 14:00 |
| api | `suggestMeals`, `mealPlan`, `sendReport` (API.md §8) + `src/lib/api.mock.ts` with the same exports | Wed 13:00 | — |
| auth | `signInApple()`, `sendEmailCode(email)`, `verifyEmailCode(email, code)`, `signOut()`, `useSession(): { user, provider: 'apple'|'email'|null }`, `useSyncStatus(): 'off'|'idle'|'syncing'|'error'` | Thu 10:30 | T17 UI starts at 10:30 |
| export | `exportData(): Promise<Result>` in `src/lib/export.ts` | Thu 16:00 | the row is visible, the call lands with T19 |
If a signature is missing or wrong when you need it, write "ZAHTJEV ZA A: ..." and continue with a local adapter in
your own feature folder; never edit A's files.

## Tasks and prompts (paste one per session, after `/clear`, on a new branch `t/<id>-<name>`)

### T1 Scaffold (Mon 13:15, main session, Sonnet)
```
Read CLAUDE.md. Do task T1 from docs/PLAN.md. Use the Expo plugin.
Owner D. Also create apps/mobile/src/copy/sr/index.ts with t() and pl() wiring, and empty area files per COPY.md.
Do not run pnpm ios yourself; tell me when to run it.
Done when: pnpm typecheck and pnpm test:core pass, and I confirm pnpm ios shows a dark screen. Then /verify.
```
Platform: after merge, tell A to `git pull` and run `pnpm android`.

### T3 Design system + icons (Mon 14:30, ui-builder, Sonnet, plan mode)
```
Task T3 from docs/PLAN.md. Use the ui-builder subagent. Read docs/DESIGN-SYSTEM.md and docs/PLATFORMS.md §4.
Owner D. Only edit: apps/mobile/src/theme/**, src/components/**, src/app/dev.tsx, assets/**, scripts/icons.mjs.
Export every component listed in docs/team/DANILO.md "D provides to A" with those exact names.
Android: GlassCard solid fill, Icon via MaterialIcons, KeyboardScreen behavior; one Android jest test each.
Done when: the /dev gallery renders every primitive and /verify is green.
```

### T5 Navigation + route stubs (Tue 9:15, main, Sonnet) ⚡ merge at 10:15
```
Task T5 from docs/PLAN.md. Owner D.
Create every route in docs/SCREENS.md §0 as a stub (ScreenScroll with its testID), including A's (tabs)/plan,
(sheets)/prijava-greske, brisanje, kupovina. NativeTabs icons with sf + md per docs/PLATFORMS.md §4.
Add the fastself://dev deep link listener calling applyDevLink(url) from src/lib/dev.ts (A, T4); if that file is not
merged yet, guard the import and say so. Dev screen renders src/features/dev/sections/notifications.tsx (create it as
`export default () => null`; A owns it afterwards).
Done when: every route opens, iOS back swipe works, /verify green.
```

### T6 Onboarding (Tue 10:15, ui-builder, Sonnet, plan mode)
```
Task T6 from docs/PLAN.md. Use the ui-builder subagent. docs/SCREENS.md §1, docs/COPY.md onboarding block.
Owner D. Only edit: src/app/(onboarding)/**, src/features/onboarding/**, src/copy/sr/onboarding.ts.
Build PraksePicker and AlergijePicker as reusable components (Profil uses them in T13).
Use useSettings/useUpdateSettings, ensureNotificationPermission and nearestCity from A (merged Tue 11:00).
Every footer CTA has testID btn-next. Minor toggle disables IF.
Done when: e2e/maestro/01-onboarding.yaml passes on the Simulator (I run maestro), jest flow test green, /verify green.
```

### T7 Danas (Tue 14:00, ui-builder, Sonnet, plan mode)
```
Task T7 from docs/PLAN.md. Use the ui-builder subagent. docs/SCREENS.md §2, docs/COPY.md danas block.
Owner D. Only edit: src/app/(tabs)/danas.tsx, src/features/danas/**, src/app/(sheets)/izuzetak.tsx, src/copy/sr/danas.ts.
Data only from useDayPlan, useNow, useToday. Report button pushes /(sheets)/prijava-greske with { date, context: 'danas' }.
Done when: jest tests for 2.12.2026 16:30, 4.12.2026 and 8.2.2027 16:30 pass, the dial ticks via shared values, /verify green.
```

### T8 Kalendar (Wed 9:00, ui-builder, Sonnet)
```
Task T8 from docs/PLAN.md. Use the ui-builder subagent. docs/SCREENS.md §3. Owner D.
Only edit: src/app/(tabs)/kalendar.tsx, src/features/kalendar/**, src/copy/sr/kalendar.ts.
Done when: tests for Dec 2026 and 15.3.2027 pass, month navigation works across years, /verify green.
```

### T13 Profil + pushed screens (Wed 11:00, ui-builder, Sonnet)
```
Task T13 from docs/PLAN.md. Use the ui-builder subagent. docs/SCREENS.md §6–9. Owner D.
Only edit: src/app/(tabs)/profil.tsx, src/app/{prakse,alergije,vaktija,privatnost}.tsx, src/features/profil/**,
src/copy/sr/profil.ts. Reuse PraksePicker and AlergijePicker. Export row calls exportData() from src/lib/export.ts
(A, Thu): until it exists, show the row disabled with no placeholder text. Delete row pushes /(sheets)/brisanje.
Done when: every row opens its screen, vaktija offsets persist, /verify green.
```

### T12 Tajmer (Wed 14:00, ui-builder, Sonnet)
```
Task T12 from docs/PLAN.md. Use the ui-builder subagent. docs/SCREENS.md §5. Owner D.
Only edit: src/app/(tabs)/tajmer.tsx, src/features/tajmer/**, src/copy/sr/tajmer.ts.
Use fastingSessions repo and scheduleIfEnd/cancelIfEnd from A. Ring driven by shared values.
Done when: jest elapsed/goal tests pass; I kill the app in the Simulator and the timer is right after reopening; /verify green.
```

### T14 Asistent UI + AI consent (Thu 9:00, ui-builder, Sonnet)
```
Task T14 (UI part) from docs/PLAN.md. Use the ui-builder subagent. docs/SCREENS.md §10–11, docs/API.md §1.
Owner D. Only edit: src/app/asistent.tsx, src/app/(sheets)/ai-pristanak.tsx, src/features/asistent/**,
src/copy/sr/asistent.ts. Use suggestMeals from src/lib/api (A). Consent via consents.set('ai', true).
Validate every recipe again on the device with validateRecipe before rendering.
Done when: jest proves a forbidden recipe from the mock is never rendered; airplane mode shows our recipes and the
AI error text; /verify green.
```

### T17 Auth UI (Thu 10:30, ui-builder, Sonnet, plan mode)
```
Task T17 (UI part) from docs/PLAN.md. Use the ui-builder subagent. docs/SCREENS.md §1.6 and §11, docs/PLATFORMS.md §4.
Owner D. Only edit: src/app/nalog.tsx, src/app/(onboarding)/nalog.tsx, src/features/nalog/**, src/copy/sr/nalog.ts.
Use signInApple, sendEmailCode, verifyEmailCode, useSession from src/lib/auth (A). Apple button only on iOS.
Done when: email OTP works against local Supabase (I read the code in Mailpit), Apple sign-in works on my iPhone
against dev, a jest test shows no Apple button on Android, /verify green.
```

### T20 Motion polish (Thu 12:00, ui-builder, Sonnet), P1
```
Task T20 from docs/PLAN.md. Use the ui-builder subagent. docs/DESIGN-SYSTEM.md §6. Owner D.
Only edit src/components/** and src/features/** (D's). Everything becomes a fade under Reduce Motion.
Done when: /verify green and I approve the look on the iPhone.
```

### T21 E2E (Thu 14:00, main + test-runner, Sonnet)
```
Task T21 from docs/PLAN.md. Owner D. Write e2e/maestro flows 02–05, 07, 08 per docs/TESTING.md §6, using testIDs from
docs/SCREENS.md. Do not run maestro yourself; give me the command. Fix only D's files; for A's screens write
"ZAHTJEV ZA A".
Done when: I paste a green `maestro test e2e/maestro` summary.
```

### T22 TestFlight (Thu 17:00, `/release-ios testflight`, after A confirms prod backend)
```
/release-ios testflight
```
You run `eas build -p ios --profile production` and `eas submit -p ios --latest` in your own terminal.

### Fri: T25 screenshots, T23 iOS bugs, T27 submit
- T25: `xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100`, then
  `maestro test e2e/maestro/screenshots.yaml` on the iPhone 17 Pro Max Simulator.
- T23, one session per bug:
  ```
  Bug QA-<n> from docs/QA-LOG.md. Owner D. Reproduce with a failing jest test first, then fix. Only D's paths.
  ```
- T27 with A: `/release-ios appstore`, then Submit for Review in App Store Connect.
