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
- **Screenshots**: 6.9" iPhone (iPhone 18 Pro Max Simulator), 5–6 shots from `e2e/maestro/screenshots.yaml`:
  - Danas dusk (Božićni post + IF), Danas Ramadan iftar countdown.
  - Kalendar, Plan.
  - Tajmer, Privatnost.
  Add a short caption overlay only if time allows; plain screenshots are fine.
- **Copyright**: "2026 <legal entity>".

## 5. App Privacy ("nutrition labels")
Data is collected only when the user creates an account or sends a report or rating (v1 has no AI). Declare it like this:
| Data type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Contact Info: Email Address | yes (email + password login) | yes | no | App Functionality |
| Identifiers: User ID | yes (account) | yes | no | App Functionality |
| Health & Fitness: Health (allergies), Fitness (fasting history) | yes, only with sync consent | yes | no | App Functionality |
| Sensitive Info (religious practice) | yes, only with sync consent | yes | no | App Functionality |
| User Content: Other (error reports and ratings) | yes | no | no | App Functionality |
| Location: Coarse Location | yes, only with sync consent (the chosen city syncs with practices and settings; GPS coordinates are never sent) | yes | no | App Functionality |
| Diagnostics | no (unless crash reporting is added later) | | | |
Do not track and do not use the ATT prompt. AI requests contain no personal data (see API.md §1).

## 6. Guideline checklist mapped to the app (the auditor verifies each)
| Guideline | Requirement | Where it is met |
|---|---|---|
| 1.4.1 | No unvalidated health claims; remind people to consult a doctor | onboarding sigurnost, Tajmer caption, Danas disclaimer, COPY rules |
| 2.1 | No crashes, no placeholders, backend live during review | QA matrix, copy test, prod keepalive cron |
| 2.3 | Accurate metadata and screenshots from the real app | Maestro screenshots |
| 4.0 | Native UI, no web wrapper; sign-in inside the app | Expo native, native Apple button |
| 4.8 | Sign in with Apple if third-party login is offered | v1 offers only first-party email + password, so not required |
| 5.1.1(i) | Privacy policy in the app and in App Store Connect | Profil → Privatnost → link; ASC URL |
| 5.1.1(ii) | Consent for data collection, revocable | consents table, Profil switches |
| 5.1.1(iii) | Data minimisation | city only, no coordinates; AI payload minimal |
| 5.1.1(iv) | Respect permission refusal; no forced permissions | dozvole optional; app works without |
| 5.1.1(v) | Login optional when not required; **in-app account deletion**; revoke the Apple token | guest mode, brisanje sheet, delete-account function |
| 5.1.2(i) | Disclose and get permission before sharing personal data with third-party AI | v1 has no AI (entry points hidden) |
| 5.1.3 | Health data not used for ads, not stored in iCloud | none |
| 5.6 | Honest developer behaviour; support contact works | support page and email |

## 7. Review notes (App Review Information → Notes)
```
fastself.ai shows daily fasting rules and times for Orthodox fasting, Ramadan and intermittent fasting.
No login is required: all features work as a guest. An account (email + password) is optional and only syncs
practices, allergies and fasting history between devices.
Demo account: review@fastself.ai / <password set by Andrej on prod>. Profil → Prijavi se ili napravi nalog → Prijava.
To delete an account: Profil → Obriši nalog (on the account card and in the Privatnost group). This deletes the
account and all server data immediately.
Terms of use: Profil → Uslovi korišćenja. Privacy summary: Profil → Politika privatnosti.
Rating: Profil → Ocijeni aplikaciju (anonymous feedback to the team).
Version 1.0 has no AI features.
The app is not a medical app and contains no health claims. Interface language: Montenegrin.
```
Demo account (v1 decision, 27 Nov): `review@fastself.ai` with a long fixed password, created by A on prod
(email confirmation off or the address confirmed), never deleted, sync data seeded with one practice. Put the email and
the password into App Store Connect → App Review Information → Sign-in required, and into Play Console → App access.

## 8. TestFlight "What to test" (external)
"Prođi onboarding, izaberi bar jednu praksu, otvori Danas, Kalendar i Tajmer. Probaj prijavu, ocjenu i brisanje naloga.
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
