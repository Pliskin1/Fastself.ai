import type { ExpoConfig } from 'expo/config';

const BG = '#03040D';
const LOCATION_TEXT =
  'Lokaciju koristimo jednom, da pronađemo najbliži grad za vaktiju. Koordinate ne čuvamo i ne šaljemo.';

const config: ExpoConfig = {
  name: 'fastself.ai',
  // Must match the EAS project on expo.dev (@pliskin1s-team/fastselfai, projectId below).
  owner: 'pliskin1s-team',
  slug: 'fastselfai',
  scheme: 'fastself',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: BG,
  ios: {
    bundleIdentifier: 'ai.fastself.app',
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_TEXT,
      CFBundleAllowMixedLocalizations: true,
      CFBundleDevelopmentRegion: 'sr',
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1'],
        },
      ],
    },
  },
  android: {
    package: 'ai.fastself.app',
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: BG,
    },
    softwareKeyboardLayoutMode: 'resize',
    predictiveBackGestureEnabled: false,
    permissions: ['ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS'],
    blockedPermissions: ['android.permission.ACCESS_BACKGROUND_LOCATION', 'android.permission.RECORD_AUDIO'],
  },
  plugins: [
    './plugins/with-no-user-script-sandboxing',
    'expo-router',
    ['expo-splash-screen', { backgroundColor: BG, image: './assets/images/splash-icon.png', imageWidth: 76 }],
    'expo-font',
    'expo-sqlite',
    ['expo-notifications', { color: '#FFC86E' }],
    ['./plugins/with-location-texts', { text: LOCATION_TEXT }],
    [
      'expo-location',
      {
        locationWhenInUsePermission: LOCATION_TEXT,
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  // The EAS project on expo.dev: builds and the production env vars (EXPO_PUBLIC_SUPABASE_*) live there.
  extra: { eas: { projectId: '7d792b08-4d45-4e35-8091-cd15a7ad385c' } },
};

export default config;
