import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Body, Display, PrimaryButton, ScreenScroll, useMotion } from '@/components';
import { layout } from '@/theme/tokens';

type Props = {
  testID: string;
  title: string;
  sub?: string;
  cta: string;
  onNext: () => void;
  disabled?: boolean;
  children?: ReactNode;
};

/** Title, scrolling body and the fixed footer CTA (always testID btn-next) shared by onboarding steps 1 to 4. */
export function OnboardingScreen({ testID, title, sub, cta, onNext, disabled, children }: Props) {
  const insets = useSafeAreaInsets();
  const { enter } = useMotion();
  return (
    <View style={styles.fill}>
      <ScreenScroll testID={testID} bottomInset={96} contentStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View entering={enter(0)} style={styles.head}>
          <Display>{title}</Display>
          {sub ? <Body tone="mist">{sub}</Body> : null}
        </Animated.View>
        {children}
      </ScreenScroll>
      <LinearGradient
        pointerEvents="box-none"
        colors={['rgba(3,4,13,0)', 'rgba(3,4,13,0.92)']}
        style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}
      >
        <PrimaryButton label={cta} onPress={onNext} disabled={disabled} testID="btn-next" />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingTop: 12 },
  head: { gap: 8 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 28,
    paddingHorizontal: layout.screenPadding,
  },
});
