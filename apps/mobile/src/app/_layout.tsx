import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SkyBackground, ToastProvider } from '@/components';
import { applyDevLink } from '@/lib/dev';
import { useAppFonts } from '@/theme/fonts';

SplashScreen.preventAutoHideAsync();

const SHEET = {
  presentation: 'formSheet' as const,
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.5, 1],
  contentStyle: { backgroundColor: 'transparent' },
};

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
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
              <Stack.Screen name="(sheets)/prijava-greske" options={SHEET} />
              <Stack.Screen name="(sheets)/ai-pristanak" options={SHEET} />
              <Stack.Screen name="(sheets)/brisanje" options={SHEET} />
              <Stack.Screen name="(sheets)/izuzetak" options={SHEET} />
              <Stack.Screen name="(sheets)/kupovina" options={SHEET} />
            </Stack>
          </View>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#03040D' } });
