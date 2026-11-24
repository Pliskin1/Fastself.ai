import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop, Circle } from 'react-native-svg';
import {
  CITIES,
  horizonGlowOpacity,
  moonPath,
  moonPhase,
  skyColors,
  starsOpacity,
  sunAltitude,
  toDayNum,
  type CityId,
} from '@fastself/core';
import { useMotion } from './useMotion';

const STAR_COUNT = 54;
const STAR_AREA = 540;

function makeStars(width: number) {
  let seed = 7;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: STAR_COUNT }, () => ({
    x: next() * width,
    y: next() * STAR_AREA,
    size: 1 + next() * 1.6,
    base: 0.35 + next() * 0.6,
    period: 2200 + next() * 3400,
  }));
}

type Sky = { top: string; mid: string; bottom: string; glow: number; stars: number; phase: number; alt: number };

function skyAt(now: Date, city: CityId, demoHour: number | null): Sky {
  const n = toDayNum(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const minutes = demoHour === null ? now.getHours() * 60 + now.getMinutes() : demoHour * 60;
  const { lat, lng } = CITIES[city];
  const { alt, morning } = sunAltitude(n, minutes, lat, lng);
  const [top, mid, bottom] = skyColors(alt, morning);
  return {
    top,
    mid,
    bottom,
    glow: horizonGlowOpacity(alt),
    stars: starsOpacity(alt),
    phase: moonPhase(n).phase,
    alt,
  };
}

type StarProps = { x: number; y: number; size: number; base: number; period: number; animate: boolean };

const Star = memo(function Star({ x, y, size, base, period, animate }: StarProps) {
  const o = useSharedValue(base);
  useEffect(() => {
    if (!animate) {
      o.value = base;
      return;
    }
    o.value = withRepeat(
      withSequence(
        withTiming(base * 0.3, { duration: period / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(base, { duration: period / 2, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    return () => cancelAnimation(o);
  }, [animate, base, period, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: '#fff',
        },
        style,
      ]}
    />
  );
});

type Props = {
  /** Welcome screen only: the day runs 0 to 24 h over 20 s, looped. */
  demoCycle?: boolean;
  /** Overlay used on push screens and sheets. */
  dim?: boolean;
  width?: number;
  city?: CityId;
};

export function SkyBackground({ demoCycle = false, dim = false, width = 390, city = 'podgorica' }: Props) {
  const { reduced } = useMotion();
  const [tick, setTick] = useState(() => Date.now());
  const [demoHour, setDemoHour] = useState(0);

  useEffect(() => {
    if (demoCycle && reduced) {
      setDemoHour(19);
      return;
    }
    if (demoCycle) {
      const start = Date.now();
      const id = setInterval(() => setDemoHour((((Date.now() - start) / 20000) * 24) % 24), 400);
      return () => clearInterval(id);
    }
    const update = () => setTick(Date.now());
    const id = setInterval(update, 60000);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && update());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [demoCycle, reduced]);

  const target = useMemo(
    () => skyAt(new Date(tick), city, demoCycle ? demoHour : null),
    [tick, city, demoCycle, demoHour],
  );
  const [layers, setLayers] = useState<{ prev: Sky; cur: Sky }>({ prev: target, cur: target });
  const fade = useSharedValue(1);

  useEffect(() => {
    setLayers((l) => ({ prev: l.cur, cur: target }));
    fade.value = 0;
    fade.value = withTiming(1, { duration: reduced ? 0 : demoCycle ? 400 : 1600 });
  }, [target, reduced, demoCycle, fade]);

  const curStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const stars = useMemo(() => makeStars(width), [width]);
  const moonVisible = target.alt < -4;
  const { prev, cur } = layers;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={[prev.top, prev.mid, prev.bottom]}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, curStyle]}>
        <LinearGradient
          colors={[cur.top, cur.mid, cur.bottom]}
          locations={[0, 0.58, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Svg style={styles.glow} width="100%" height={320}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="100%" rx="60%" ry="100%">
              <Stop offset="0" stopColor={cur.bottom} stopOpacity={cur.glow} />
              <Stop offset="1" stopColor={cur.bottom} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="100%" rx="70%" ry="100%" fill="url(#glow)" />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { opacity: cur.stars }]}>
          {stars.map((s, i) => (
            <Star key={i} {...s} animate={!reduced} />
          ))}
        </View>
        {moonVisible ? (
          <Svg style={styles.moon} width={60} height={60} viewBox="0 0 60 60">
            <Circle cx={30} cy={30} r={29} fill="rgba(233,238,255,0.10)" />
            <Path d={moonPath(cur.phase, 30, 30, 24)} fill="rgba(233,238,255,0.92)" />
          </Svg>
        ) : null}
      </Animated.View>
      {dim ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2,3,12,0.32)' }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  moon: { position: 'absolute', right: 30, top: 64 },
});
