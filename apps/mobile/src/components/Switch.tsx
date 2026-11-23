import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { spring } from '@/theme/motion';
import { color } from '@/theme/tokens';
import { haptics } from './haptics';
import { useMotion } from './useMotion';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
};

export function Switch({ value, onValueChange, accessibilityLabel, disabled, testID }: Props) {
  const { reduced } = useMotion();
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = reduced ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: 300 });
  }, [value, reduced, progress]);
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['rgba(255,255,255,0.18)', color.sun]),
  }));
  const knob = useAnimatedStyle(() => {
    const x = value ? 23 : 3;
    return { transform: [{ translateX: reduced ? x : withSpring(x, spring.knob) }] };
  }, [value, reduced]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      testID={testID}
      hitSlop={{ top: 7, bottom: 7, left: 0, right: 0 }}
      onPress={() => {
        haptics.selection();
        onValueChange(!value);
      }}
      style={disabled ? styles.disabled : undefined}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 50, height: 30, borderRadius: 15, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  disabled: { opacity: 0.45 },
});
