import type { ExpoConfig } from 'expo/config';

const BG = '#03040D';

const config: ExpoConfig = {
  name: 'fastself.ai',
  slug: 'fastself',
  scheme: 'fastself',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: BG,
  ios: {
    bundleIdentifier: 'ai.fastself.app',
    supportsTablet: false,
    usesAppleSignIn: true,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Lokaciju koristimo jednom, da pronađemo najbliži grad za vaktiju. Koordinate ne čuvamo i ne šaljemo.',
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
    'expo-router',
    ['expo-splash-screen', { backgroundColor: BG, image: './assets/images/splash-icon.png', imageWidth: 76 }],
    'expo-font',
    'expo-sqlite',
    ['expo-notifications', { color: '#FFC86E' }],
    'expo-apple-authentication',
    ['expo-location', { isAndroidBackgroundLocationEnabled: false }],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
