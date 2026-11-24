/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-worklets', () => ({}));
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const { useRef } = require('react');
  const chain = { duration: () => chain, delay: () => chain, easing: () => chain };
  const bezier = () => (t) => t;
  const ease = (t) => t;
  return {
    __esModule: true,
    default: { View },
    View,
    Easing: { bezier, inOut: () => ease, quad: ease },
    FadeInDown: chain,
    useReducedMotion: () => false,
    useSharedValue: (v) => {
      const ref = useRef({ value: v });
      return ref.current;
    },
    useAnimatedStyle: (fn) => fn(),
    interpolateColor: (_v, _in, out) => out[0],
    withTiming: (v) => v,
    withSpring: (v) => v,
    withDelay: (_d, v) => v,
    withRepeat: (v) => v,
    withSequence: (...v) => v[v.length - 1],
    cancelAnimation: () => undefined,
  };
});
