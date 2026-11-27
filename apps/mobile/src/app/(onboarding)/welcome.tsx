import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Body, PrimaryButton, PressScale, ScreenScroll, SkyBackground, Text, useMotion } from '@/components';
import { t } from '@/copy/sr';
import { color } from '@/theme/tokens';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { enter } = useMotion();
  return (
    <View style={styles.fill}>
      <SkyBackground demoCycle moon />
      <View style={[styles.brand, { top: insets.top + 14 }]}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9.5} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.4} />
          <Path
            d="M12 2.5 A 9.5 9.5 0 0 1 21.5 12"
            fill="none"
            stroke={color.sun}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <Circle cx={21.5} cy={12} r={2.4} fill="#FFE7B0" />
        </Svg>
        <Text variant="bodyStrong">{t('ob.brand')}</Text>
      </View>
      <ScreenScroll testID="screen-welcome" contentStyle={styles.content}>
        <Animated.View entering={enter(0)} style={styles.copy}>
          <Text variant="hero" accessibilityRole="header">
            {t('ob.welcome.title')}
          </Text>
          <Body tone="mist" style={styles.body}>
            {t('ob.welcome.body')}
          </Body>
        </Animated.View>
        <Animated.View entering={enter(2)} style={styles.actions}>
          <PrimaryButton
            testID="btn-start"
            label={t('ob.welcome.start')}
            onPress={() => router.push('/(onboarding)/prakse' as Href)}
          />
          <PressScale
            testID="btn-have-account"
            accessibilityRole="button"
            accessibilityLabel={t('ob.welcome.haveAccount')}
            onPress={() => router.push('/(onboarding)/nalog?returning=1' as Href)}
            style={styles.ghost}
          >
            <Text variant="bodyStrong">{t('ob.welcome.haveAccount')}</Text>
          </PressScale>
          <Text variant="caption" tone="mist" style={styles.caption}>
            {t('ob.welcome.caption')}
          </Text>
        </Animated.View>
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  brand: { position: 'absolute', left: 28, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 2 },
  content: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 28, gap: 28 },
  copy: { gap: 16 },
  body: { fontSize: 17, lineHeight: 25 },
  actions: { gap: 6 },
  ghost: { height: 48, alignItems: 'center', justifyContent: 'center' },
  caption: { textAlign: 'center' },
});
