import { StyleSheet, TextInput, type TextInputProps, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { dur, ease } from '@/theme/motion';
import { useMotion } from './useMotion';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  /** The digit, rewritten on the UI thread (no React render per second). */
  text: SharedValue<string>;
  initial: string;
  size: number;
  lineHeight?: number;
  style?: TextStyle | TextStyle[];
};

/**
 * One odometer digit in a fixed-width cell, so the numbers never jitter. When the digit changes it rolls in from
 * above (translateY −0.42em to 0 with a fade, 520 ms expo, DESIGN-SYSTEM §6); under Reduce Motion it just changes.
 */
export function OdometerDigit({ text, initial, size, lineHeight = size * 1.06, style }: Props) {
  const { reduced } = useMotion();
  const y = useSharedValue(0);
  const o = useSharedValue(1);

  useAnimatedReaction(
    () => text.value,
    (next, prev) => {
      if (reduced || prev === null || next === prev) return;
      y.value = -0.42 * size;
      o.value = 0.15;
      y.value = withTiming(0, { duration: 520, easing: ease.expo });
      o.value = withTiming(1, { duration: dur.small });
    },
    [reduced, size],
  );

  const props = useAnimatedProps(() => ({ text: text.value, defaultValue: text.value }) as unknown as TextInputProps);
  const roll = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));

  return (
    <Animated.View style={[styles.clip, { width: size * 0.58, height: lineHeight }]}>
      <Animated.View style={roll}>
        <AnimatedTextInput
          editable={false}
          pointerEvents="none"
          accessible={false}
          defaultValue={initial}
          animatedProps={props}
          style={[styles.cell, { width: size * 0.58, fontSize: size, lineHeight }, style]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  cell: { padding: 0, textAlign: 'center' },
});
