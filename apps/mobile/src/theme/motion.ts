import { Easing } from 'react-native-reanimated';

export const ease = {
  expo: Easing.bezier(0.16, 1, 0.3, 1),
  std: Easing.bezier(0.2, 0, 0, 1),
};

export const dur = { micro: 160, small: 260, medium: 420, enter: 560, large: 700, draw: 1500 } as const;

export const spring = {
  pop: { damping: 14, stiffness: 180, mass: 0.9 },
  knob: { damping: 16, stiffness: 260 },
};
