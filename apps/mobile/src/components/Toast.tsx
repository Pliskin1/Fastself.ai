import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spring } from '@/theme/motion';
import { GlassCard } from './GlassCard';
import { haptics } from './haptics';
import { Text } from './Text';
import { useMotion } from './useMotion';

type ToastApi = { show: (message: string) => void };

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { reduced } = useMotion();
  const [message, setMessage] = useState('');
  const y = useSharedValue(-140);
  const opacity = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(text);
      haptics.success();
      if (reduced) {
        opacity.value = withTiming(1, { duration: 160 });
      } else {
        y.value = withSpring(0, spring.pop);
        opacity.value = 1;
      }
      timer.current = setTimeout(() => {
        if (reduced) {
          opacity.value = withTiming(0, { duration: 160 });
        } else {
          y.value = withTiming(-140, { duration: 620 });
          opacity.value = withTiming(0, { duration: 620 });
        }
      }, 2600);
    },
    [reduced, y, opacity],
  );

  const api = useMemo(() => ({ show }), [show]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Animated.View
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        style={[styles.host, { top: insets.top + 8 }, style]}
      >
        <GlassCard radius={22} contentStyle={styles.body}>
          <Text variant="bodyStrong" accessibilityRole="alert">
            {message}
          </Text>
        </GlassCard>
      </Animated.View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 20, right: 20 },
  body: { paddingHorizontal: 18, paddingVertical: 14 },
});
