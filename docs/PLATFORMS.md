# Platforms: where the work differs between iOS and Android

One Expo codebase, one app. **iOS is the release target this week** (TestFlight + App Store review).
**Android runs from the same code every day** (Andrej's phone) and ships to Google Play in v1.1 (D-02).
If the mentors want Android now, use §7 "Android preview build" (an APK link), not the Play Store.

Rule for code: write it once. Use `Platform.OS` (or `Platform.select`) **only** for the items in §4, in the
component that owns the difference, never scattered across screens.

## 1. Who and where
| | Danilo (D) | Andrej (A) |
|---|---|---|
| Computer | Mac | Windows |
| Phone | iPhone | Android |
| Runs the app | iOS Simulator (`pnpm ios`), iPhone (`pnpm ios:device`) | Android phone or emulator (`pnpm android`) |
| Only he can | Xcode, iOS Simulator, Maestro, TestFlight install, App Store screenshots, Sign in with Apple test | Android device checks, TalkBack |
| Both can | code, all terminal tests, local Supabase (Docker), dev Supabase, EAS cloud builds, PRs | same |

## 2. Running the app
| Target | Command | First run | Notes |
|---|---|---|---|
| iOS Simulator | `pnpm ios` | 5–10 min (native build) | picks "iPhone 18 Pro"; `pnpm ios -- --device "iPhone 18 Pro Max"` for another |
| iPhone (USB) | `pnpm ios:device` | 5–10 min | Developer Mode on; Xcode → Settings → Accounts has the Apple ID |
| Android phone (USB) | `pnpm android` | 5–15 min | USB debugging on; `adb devices` lists it |
| Android emulator | start it in Android Studio → Device Manager, then `pnpm android` | 5–15 min | Pixel, Android 15+ image |
| After the first build | `pnpm start` and open the installed app | seconds | JS changes reload live; rebuild only after adding a native package or changing `app.config.ts` plugins |

Dev clock and presets on each platform (`__DEV__` only, SCREENS.md §0):
- iOS: `xcrun simctl openurl booted "fastself://dev?preset=orthodox-if&date=2026-12-02&time=16:30"`
- Android: `adb shell am start -a android.intent.action.VIEW -d "fastself://dev?preset=orthodox-if&date=2026-12-02&time=16:30"`
- Both: the `/dev` screen in the app has the same controls.

## 3. Reaching local Supabase from each target
`127.0.0.1` means "this device". It only reaches your computer from the iOS Simulator.
| Target | `EXPO_PUBLIC_SUPABASE_URL` in `apps/mobile/.env.local` | Extra step |
|---|---|---|
| iOS Simulator | `http://127.0.0.1:54321` | none |
| Android phone or emulator (USB/adb) | `http://127.0.0.1:54321` | `adb reverse tcp:54321 tcp:54321` once per connection |
| iPhone (USB or Wi-Fi) | `http://<Mac LAN IP>:54321`, e.g. `http://192.168.1.23:54321` | same Wi-Fi; find the IP with `ipconfig getifaddr en0` |
| Anything, simplest | the **dev** cloud project URL and anon key | none (needs internet) |
Restart Metro (`pnpm start -- --clear`) after changing `.env.local`.

## 4. Feature differences (the only places where code may branch)
| Area | iOS | Android | Where it lives | Checked by |
|---|---|---|---|---|
| Tab bar | NativeTabs with Liquid Glass, SF Symbols (`sf`) | Material bottom tabs, Material Symbols (`md`), max 5 tabs (we have 5) | `src/app/(tabs)/_layout.tsx`: `<NativeTabs.Trigger.Icon sf="sun.horizon" md="wb_twilight" />` | D, A |
| Tab icons | `sun.horizon`, `calendar`, `list.bullet`, `timer`, `person.crop.circle` | `wb_twilight`, `calendar_month`, `list`, `timer`, `account_circle` | same file | D, A |
| Other icons | `SymbolView` (expo-symbols) | `MaterialIcons` (@expo/vector-icons) | `src/components/Icon.tsx` maps one name to both (DESIGN-SYSTEM §7) | D |
| Glass cards | `GlassView` on iOS 26+, `BlurView` before | solid fill `rgba(22,26,58,0.82)` + border, no blur | `src/components/GlassCard.tsx` | D |
| Sheets | `formSheet` with detents and grabber | the same route options render as a bottom sheet; check heights | `src/app/_layout.tsx` | A |
| Back | edge swipe | system back button or gesture: closes a sheet, goes one onboarding step back, exits the app on a tab root | Expo Router handles it; onboarding steps use router history, not local state | A |
| Sign in | Sign in with Apple + email code | **email code only** (no Apple button) | `src/features/nalog`: render the Apple button only if `Platform.OS === 'ios' && await AppleAuthentication.isAvailableAsync()` | D (Apple), A (email) |
| Notifications permission | system prompt on the dozvole step | Android 13+: `POST_NOTIFICATIONS` prompt on the same step; older Android: granted by default | `src/notifications/permissions.ts` | D, A |
| Notification channel | not needed | **required**: create channel `podsjetnici` (importance HIGH) before scheduling, at app start | `src/notifications/channels.ts` | A |
| Notification timing | on time | can arrive a few minutes late (battery saving; we do not use exact alarms) | nothing to code; the UI still shows exact times | A |
| Location | When In Use prompt with COPY `perm.location` | foreground coarse location prompt (`ACCESS_COARSE_LOCATION`); no background location | `expo-location` with `Accuracy.Low`; plugin option `isAndroidBackgroundLocationEnabled: false` | D, A |
| Keyboard | `KeyboardAvoidingView behavior="padding"` | `behavior={undefined}` and `android.softwareKeyboardLayoutMode: 'resize'` in app config | `src/components/KeyboardScreen.tsx` | A |
| Safe areas | notch and home indicator | edge-to-edge is always on: status bar and the gesture/nav bar overlap the app | always use `useSafeAreaInsets()` / `ScreenScroll` | A |
| Haptics | full Taptic Engine | weaker, varies by phone | `src/components/haptics.ts`; never the only feedback | — |
| Screen reader | VoiceOver | TalkBack | same props (`accessibilityRole`, `accessibilityLabel`) | D, A |
| Reduce motion | Settings → Accessibility → Motion | Settings → Accessibility → Remove animations | `useReducedMotion()` covers both | D, A |
| Reduce transparency | `AccessibilityInfo.isReduceTransparencyEnabled()` → solid cards | no such setting (cards are solid anyway) | `GlassCard.tsx` | D |
| Text size | Larger Text | Font size + Display size | same layouts must not clip | D, A |
| Export JSON | share sheet | share sheet | `expo-sharing` + `expo-file-system`, same code | A |
| Fonts, SQLite, session, sync, AI, rules | same | same | no branching allowed | — |

## 5. App config (apps/mobile/app.config.ts), per platform
- Shared: name, slug, scheme `fastself`, version, icon, splash (`#03040D`), `userInterfaceStyle: 'dark'`, plugins.
- iOS: `bundleIdentifier: 'ai.fastself.app'`, `supportsTablet: false`, `config.usesNonExemptEncryption: false`,
  `infoPlist.NSLocationWhenInUseUsageDescription`, `usesAppleSignIn: true`.
- Android: `package: 'ai.fastself.app'`, `adaptiveIcon: { foregroundImage, backgroundColor: '#03040D' }`,
  `softwareKeyboardLayoutMode: 'resize'`, `permissions: ['ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS']`,
  `blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION', 'android.permission.RECORD_AUDIO']`.
- `expo-notifications` plugin: `icon: './assets/notification-icon.png'` (96×96 white glyph on transparent, Android
  only), `color: '#FFC86E'`.

## 6. eas.json (T1 writes it into apps/mobile)
```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "environment": "development" },
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "android": { "buildType": "apk" }
    },
    "production": {
      "environment": "production",
      "autoIncrement": true,
      "ios": { "image": "latest" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": { "production": {} }
}
```
- `appVersionSource: "remote"` + `autoIncrement`: EAS raises the iOS build number and Android versionCode on every
  production build. Nobody edits `buildNumber` by hand. `version` stays `1.0.0` until review passes.
- Env vars for cloud builds (`.env.local` is not uploaded). A runs once, after `eas init`:
  ```
  eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<prod-ref>.supabase.co --visibility plaintext
  eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <prod anon key> --visibility plaintext
  eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://<dev-ref>.supabase.co --visibility plaintext
  eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <dev anon key> --visibility plaintext
  ```
  `eas env:list --environment production` must show both before any production build.

## 7. Builds and distribution
| | iOS | Android |
|---|---|---|
| Daily development | local build (`pnpm ios`, `pnpm ios:device`) | local build (`pnpm android`) |
| Share a test build | TestFlight (`eas build -p ios --profile production` + `eas submit -p ios --latest`) | **preview APK**: `eas build -p android --profile preview` → EAS gives a link and QR code; testers install the APK (allow "install unknown apps") |
| Store this week | App Store review (T27) | none (D-02) |
| Store later (v1.1) | updates | Play Console ($25 once). A new **personal** account must run a closed test with at least 12 testers for 14 days before production; an organization account is exempt but needs a D-U-N-S number |
| Who can build | D and A (EAS cloud; `--local` only on the Mac) | D and A (EAS cloud or local) |
| Free EAS quota | 15 iOS builds per month | separate Android quota; preview APKs count |

## 8. Testing per platform
- Terminal tests (Vitest, Jest, pgTAP, Deno) are platform-free and run for both on any machine and in CI.
- Jest renders with `Platform.OS = 'ios'` by default. Every component listed in §4 has one extra test with
  `jest.replaceProperty(Platform, 'OS', 'android')` (Apple button absent, solid card, `md` icon names).
- Maestro E2E runs on the iOS Simulator only (D). Android is checked by hand with the smoke list below.
- **Android smoke list** (A, every evening from Tue, and on the final build; log in `docs/QA-LOG.md`, Android column):
  1. Fresh install → onboarding → guest → Danas shows the right title for today and for the dev date 2.12.2026.
  2. All 5 tabs open; the system back button closes sheets and steps back in onboarding.
  3. Kalendar month change; Plan 7/30; Tajmer start, kill the app, reopen: time is right.
  4. Notification permission prompt appears on the dozvole step; a test reminder arrives (dev screen "send test").
  5. Šta da jedem: our recipes offline; AI with consent online; a recipe with the day's forbidden food never shows.
  6. Email login (code from Mailpit locally, or a real inbox on dev), sync on, the same data appears on D's iPhone.
  7. Export JSON opens the share sheet; delete account works and signs out.
  8. TalkBack reads the dial and buttons; largest font size does not clip; dark navigation bar does not cover buttons.
- iOS-only checks (D): Sign in with Apple, Liquid Glass look, TestFlight install, VoiceOver, App Store screenshots.

## 9. Platform gotchas
- Never ship `Platform.OS` checks for things that are the same (rules, dates, AI, sync). They hide bugs on one platform.
- The Apple button must never render on Android: it throws there.
- Schedule notifications only after the Android channel exists, or Android drops them silently.
- `127.0.0.1` from a real phone is the phone itself (§3).
- Do not commit `apps/mobile/ios/` or `apps/mobile/android/`; they are generated (`.gitignore`).
- Windows paths: keep the repo at `C:\dev\fastself` (short path; long paths break Gradle).
- If Gradle fails on Windows after a dependency change: `cd apps/mobile/android && .\gradlew clean`, then `pnpm android`.
