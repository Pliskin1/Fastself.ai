import * as Linking from 'expo-linking';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SkyBackground, ToastProvider } from '@/components';
import { applyDevLink } from '@/lib/dev';
import { startNotificationSync } from '@/notifications';
import { startSync } from '@/sync';
import { useAppFonts } from '@/theme/fonts';

SplashScreen.preventAutoHideAsync();

const NAV_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: 'transparent', card: 'transparent' },
};

const SHEET = {
  presentation: 'formSheet' as const,
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.5, 1],
  contentStyle: { backgroundColor: 'transparent' },
};

// Forms taller than half the screen open fully, so the send button is not hidden below the edge.
const TALL_SHEET = { ...SHEET, sheetAllowedDetents: [1] };

function useDevLink() {
  useEffect(() => {
    if (!__DEV__) return;
    const apply = (url: string | null) => {
      if (url) applyDevLink(url).catch(() => undefined);
    };
    Linking.getInitialURL().then(apply, () => undefined);
    const sub = Linking.addEventListener('url', ({ url }) => apply(url));
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const fontsReady = useAppFonts();
  useDevLink();

  useEffect(() => {
    const stopSync = startSync();
    const stopNotifications = startNotificationSync();
    return () => {
      stopSync();
      stopNotifications();
    };
  }, []);

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ToastProvider>
          <View style={styles.root}>
            <SkyBackground />
            <StatusBar style="light" />
            <ThemeProvider value={NAV_THEME}>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
                <Stack.Screen name="(sheets)/prijava-greske" options={TALL_SHEET} />
                <Stack.Screen name="(sheets)/ai-pristanak" options={SHEET} />
                <Stack.Screen name="(sheets)/brisanje" options={SHEET} />
                <Stack.Screen name="(sheets)/izuzetak" options={SHEET} />
                <Stack.Screen name="(sheets)/kupovina" options={SHEET} />
              </Stack>
            </ThemeProvider>
          </View>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#03040D' } });
