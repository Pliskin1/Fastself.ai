import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Caption, IconButton, useMotion } from '@/components';
import { t } from '@/copy/sr';
import { stepFromSegment, stepNumber, TOTAL_STEPS } from '@/features/onboarding';
import { color } from '@/theme/tokens';

const BAR_WIDTH = 128;

function Header({ n }: { n: number }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { reduced, ms } = useMotion();
  const progress = useSharedValue(n / TOTAL_STEPS);
  useEffect(() => {
    progress.value = reduced ? n / TOTAL_STEPS : withTiming(n / TOTAL_STEPS, { duration: ms(420) });
  }, [n, reduced, ms, progress]);
  const fill = useAnimatedStyle(() => ({ width: BAR_WIDTH * progress.value }));

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <IconButton icon="back" accessibilityLabel={t('common.back')} onPress={() => router.back()} testID="btn-back" />
      <View style={styles.progress}>
        <Caption>{t('ob.step', { n })}</Caption>
        <View style={styles.bar}>
          <Animated.View style={[styles.fill, fill]} />
        </View>
      </View>
    </View>
  );
}

export default function OnboardingLayout() {
  const segments = useSegments();
  const step = stepFromSegment(segments[segments.length - 1]);
  const n = step ? stepNumber(step) : null;
  return (
    <View style={styles.root}>
      {n !== null ? <Header n={n} /> : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  progress: { alignItems: 'flex-end', gap: 6 },
  bar: { width: BAR_WIDTH, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: color.sun },
});
