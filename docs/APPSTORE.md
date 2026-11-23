# App Store: everything needed to pass review

## 1. Identifiers and accounts (Day 0)
- Apple Developer Program (paid) and the team that will own the app.
  - Preferred: the Coinis organisation team, with D and A added in App Store Connect as App Manager or Developer.
  - An individual account works too. Its seller name shows on the store, and organisation enrolment needs a D-U-N-S
    number, which takes days, so do not start one this week.
- Bundle ID `ai.fastself.app` (explicit) with the capabilities **Sign in with Apple** and Push Notifications (local only;
  keep it off unless expo-notifications requires it).
- App record in App Store Connect:
  - Name "fastself.ai" (max 30). Subtitle, e.g. "Post, Ramazan i IF po satu" (max 30).
  - Primary language English (U.S.). Add the localisation **Croatian** if Serbian or Montenegrin is not offered.
  - SKU `fastself-ios-1`.
- Sign in with Apple key (.p8), for token exchange and revoke. Store it in the Supabase secrets only, never in git.
- Expo: `eas init` in apps/mobile. `eas credentials` lets EAS manage the distribution cert and provisioning profile.

## 2. App config (apps/mobile/app.config.ts)
- `version: '1.0.0'`. Build numbers are managed by EAS (`appVersionSource: "remote"` + `autoIncrement`, PLATFORMS.md §6);
  never set `ios.buildNumber` by hand.
- `ios.supportsTablet: false` (no iPad screenshots needed).
- `ios.config.usesNonExemptEncryption: false` (HTTPS only, so no export compliance prompt).
- `ios.infoPlist`:
  - `NSLocationWhenInUseUsageDescription`: COPY `perm.location`. No "Always" location and no background modes.
  - `CFBundleAllowMixedLocalizations: true`, `CFBundleDevelopmentRegion: 'sr'` (the Apple button then follows the device language).
- `ios.privacyManifests`: declare the required-reason APIs used. Expo modules ship their own manifests. Add
  `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1` if AsyncStorage or UserDefaults is used, and run
  `npx expo-doctor`.
- Plugins: `expo-apple-authentication`, `expo-notifications` (icon and colour), `expo-font` (embed fonts),
  `expo-location`, `expo-sqlite`.
- App icon 1024×1024 with no alpha: the dial glyph on the night sky (`assets/icon.png`). The splash is the sky colour
  `#03040D` with the glyph.
- Build with **Xcode 26** (required for uploads since 28 Apr 2026). EAS uses the latest image by default; pin
  `"image": "latest"` in eas.json (PLATFORMS.md §6 has the whole file).
- Production builds read `EXPO_PUBLIC_SUPABASE_*` from EAS environment variables (`eas env:list --environment
  production`), not from `.env.local`. A build without them cannot log in or sync.

## 3. Builds and TestFlight
```
cd apps/mobile
eas build -p ios --profile production          # cloud, free plan: 15 iOS builds/month, low-priority queue
# or: eas build -p ios --profile production --local    (uses your Mac, no quota, needs Xcode)
eas submit -p ios --latest                      # uploads to App Store Connect
```
- Processing takes 10–30 min. Then TestFlight:
  - **Internal** group (App Store Connect users, up to 100) can test immediately, without review.
  - **External** group "Mentori" needs Beta App Review for the first build (usually under 24–48 h). Add the "What to
    test" text from §8 and a contact email.
- Keep 3–5 builds in reserve this month (free quota). If the queue is slow on Friday, use `--local` or buy the Starter plan.

## 4. Metadata (prepare in docs/store/metadata.md, paste into App Store Connect)
- **Promotional text**: "Pravoslavni post, Ramazan i isprekidani post na jednom satu."
- **Description** (EN primary, plus HR/SR localisation): what it does, who it is for, local-first privacy, AI only with
  consent. No health claims.
- **Keywords**: post,ramazan,ramadan,iftar,sehur,vaktija,pravoslavni,kalendar,IF,isprekidani,fasting,prayer times
  (≤100 chars).
- **Support URL** (required) and **Privacy Policy URL** (required). Host them on GitHub Pages from a separate
  **public** repo `fastself-site`: Pages on a private repo needs a paid GitHub plan, and the main repo stays private.
  Copy everything in `docs/legal/` (the .md files and `_config.yml`) into that repo's root, enable Pages (Settings → Pages → Deploy from branch `main`, `/root`).
  URLs: `https://<github-user>.github.io/fastself-site/privacy`, `/terms`, `/support`. Put them in `src/config.ts`
  and in App Store Connect. Marketing URL is optional.
- **Category**: Lifestyle (primary), Health & Fitness (secondary).
- **Age rating**: answer the questionnaire honestly (no violence and no user-generated content; health or wellness topics
  yes). The app itself blocks IF for under-18s.
- **Price**: free. Availability: all countries, or ME + region first.
- **Screenshots**: 6.9" iPhone (iPhone 17 Pro Max Simulator), 5–6 shots from `e2e/maestro/screenshots.yaml`:
  - Danas dusk (Božićni post + IF), Danas Ramadan iftar countdown.
  - Kalendar, Šta da jedem (validated recipe + rejected).
  - Tajmer, Privatnost.
  Add a short caption overlay only if time allows; plain screenshots are fine.
- **Copyright**: "2026 <legal entity>".

## 5. App Privacy ("nutrition labels")
Data is collected only when the user creates an account or uses AI. Declare it like this:
| Data type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Contact Info: Email Address | yes (email login; Apple may relay) | yes | no | App Functionality |
| Identifiers: User ID | yes (account) | yes | no | App Functionality |
| Identifiers: Device ID (random install id, hashed, rate limit) | yes | no | no | App Functionality |
| Health & Fitness: Health (allergies), Fitness (fasting history) | yes, only with sync consent | yes | no | App Functionality |
| Sensitive Info (religious practice) | yes, only with sync consent | yes | no | App Functionality |
| User Content: Other (error reports) | yes | no | no | App Functionality |
| Location | **no** (city is chosen on the device; coordinates are never sent) | | | |
| Diagnostics | no (unless crash reporting is added later) | | | |
Do not track and do not use the ATT prompt. AI requests contain no personal data (see API.md §1).

## 6. Guideline checklist mapped to the app (the auditor verifies each)
| Guideline | Requirement | Where it is met |
|---|---|---|
| 1.4.1 | No unvalidated health claims; remind people to consult a doctor | onboarding sigurnost, Tajmer caption, Danas disclaimer, COPY rules |
| 2.1 | No crashes, no placeholders, backend live during review | QA matrix, copy test, prod keepalive cron |
| 2.3 | Accurate metadata and screenshots from the real app | Maestro screenshots |
| 4.0 | Native UI, no web wrapper; sign-in inside the app | Expo native, native Apple button |
| 4.8 | Sign in with Apple if third-party login is offered | Apple offered (email OTP is first-party) |
| 5.1.1(i) | Privacy policy in the app and in App Store Connect | Profil → Privatnost → link; ASC URL |
| 5.1.1(ii) | Consent for data collection, revocable | consents table, Profil switches |
| 5.1.1(iii) | Data minimisation | city only, no coordinates; AI payload minimal |
| 5.1.1(iv) | Respect permission refusal; no forced permissions | dozvole optional; app works without |
| 5.1.1(v) | Login optional when not required; **in-app account deletion**; revoke the Apple token | guest mode, brisanje sheet, delete-account function |
| 5.1.2(i) | Disclose and get permission before sharing personal data with third-party AI | ai-pristanak sheet names the provider |
| 5.1.3 | Health data not used for ads, not stored in iCloud | none |
| 5.6 | Honest developer behaviour; support contact works | support page and email |

## 7. Review notes (App Review Information → Notes)
```
fastself.ai shows daily fasting rules and times for Orthodox fasting, Ramadan and intermittent fasting.
No login is required: all features work as a guest. An account is optional and only syncs data between devices.
To test account features, use Sign in with Apple with any Apple ID, or email login (a 6-digit code is emailed).
To delete an account: Profil → Obriši nalog. This deletes all server data and revokes the Sign in with Apple token.
AI meal suggestions require explicit consent (Profil → AI prijedlozi jela). We send only a list of forbidden food
categories, the meal type and chosen ingredients to <AI provider>. No personal data is sent. Every suggested recipe
is validated on the device and on the server against the day's rule and the user's allergies.
The app is not a medical app and contains no health claims. Interface language: Montenegrin.
```
Demo account: not needed (guest mode plus Sign in with Apple). If App Review asks, create `review@<domain>` with a
mailbox you control.

## 8. TestFlight "What to test" (external)
"Prođi onboarding, izaberi bar jednu praksu, otvori Danas, Kalendar i Šta da jedem. Probaj prijavu i brisanje naloga.
Prijavi greške dugmetom Prijavi grešku ili na <support email>."

## 9. If App Review rejects (typical fixes, reply in Resolution Center the same day)
- **2.1 crash or bug**: reproduce from their device and iOS version, fix, upload a new build, reply with what changed.
- **5.1.1(v) deletion hard to find**: the deletion entry must be visible in Profil without scrolling far. Also add
  "Obriši nalog" to the account card.
- **5.1.2 AI data sharing**: make sure the consent sheet names the provider and the data, and that "Ne sada" works.
- **4.8**: only if a third-party login was added; we do not add one.
- **Guideline 1.4.1**: remove any wording that sounds like health advice; point to the disclaimers.
- **Metadata**: the screenshots must show the actual app; remove claims like "najbolja" or "#1".
Every reply is short and factual and lists the steps the reviewer should follow.
