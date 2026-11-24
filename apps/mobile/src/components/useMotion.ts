import { FadeInDown } from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';
import { dur, ease, spring } from '@/theme/motion';

export function useMotion() {
  const reduced = useReducedMotion();
  return {
    reduced,
    ease,
    dur,
    spring,
    /** Duration that collapses to a short fade under Reduce Motion. */
    ms: (value: number) => (reduced ? dur.micro : value),
    /** Section enter animation; opacity-only under Reduce Motion. */
    enter: (index = 0) =>
      reduced
        ? undefined
        : FadeInDown.duration(dur.enter)
            .delay(80 + index * 60)
            .easing(ease.expo),
  };
}
