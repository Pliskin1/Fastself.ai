import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { color, radius as radii } from '@/theme/tokens';

export type GlassCardProps = ViewProps & {
  children?: ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

function useReduceTransparency(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((v) => alive && setOn(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

export function GlassCard({ children, radius = radii.card, style, contentStyle, ...rest }: GlassCardProps) {
  const reduceTransparency = useReduceTransparency();
  const frame: { -readonly [K in keyof ViewStyle]: ViewStyle[K] } = {
    borderRadius: radius,
    borderWidth: 1,
    borderColor: color.glassBorder,
    overflow: 'hidden',
  };

  let backdrop: ReactNode;
  if (Platform.OS === 'android') {
    frame.backgroundColor = color.androidGlass;
  } else if (reduceTransparency) {
    frame.backgroundColor = color.solidCard;
  } else if (isLiquidGlassAvailable()) {
    backdrop = (
      <GlassView
        pointerEvents="none"
        glassEffectStyle="regular"
        tintColor="rgba(10,12,36,0.35)"
        style={StyleSheet.absoluteFill}
      />
    );
  } else {
    backdrop = (
      <>
        <BlurView pointerEvents="none" intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,12,36,0.36)' }]} />
      </>
    );
  }

  return (
    <View {...rest} style={[frame, style]}>
      {backdrop}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.highlight}
      />
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  highlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
});
