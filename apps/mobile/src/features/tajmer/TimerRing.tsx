import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Text, useMotion } from '@/components';
import { OdometerDigit } from '@/components/OdometerDigit';
import { t } from '@/copy/sr';
import { font } from '@/theme/fonts';
import { color } from '@/theme/tokens';
import { milestones, ringA11y, stateLabel, clockOf, type TimerModel } from './model';

const SIZE = 300;
const C = SIZE / 2;
const R = 124;
const STROKE = 14;
const CIRC = 2 * Math.PI * R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const pad = (v: number): string => {
  'worklet';
  return (v < 10 ? '0' : '') + v;
};

const parts = (sec: number): { h: string; m: string; s: string } => {
  'worklet';
  const total = Math.max(0, Math.floor(sec));
  return { h: pad(Math.floor(total / 3600)), m: pad(Math.floor((total % 3600) / 60)), s: pad(total % 60) };
};

function useDigits(elapsed: SharedValue<number>) {
  const h1 = useDerivedValue(() => parts(elapsed.value).h.charAt(0));
  const h2 = useDerivedValue(() => parts(elapsed.value).h.charAt(1));
  const m1 = useDerivedValue(() => parts(elapsed.value).m.charAt(0));
  const m2 = useDerivedValue(() => parts(elapsed.value).m.charAt(1));
  const s1 = useDerivedValue(() => parts(elapsed.value).s.charAt(0));
  const s2 = useDerivedValue(() => parts(elapsed.value).s.charAt(1));
  return { h1, h2, m1, m2, s1, s2 };
}

function Cell({ text, initial, size }: { text: SharedValue<string>; initial: string; size: number }) {
  return <OdometerDigit text={text} initial={initial} size={size} lineHeight={size * 1.1} style={styles.cell} />;
}

type Props = { model: TimerModel; now: SharedValue<number>; reminderOn: boolean };

/** The ring, its odometer and the comet head all follow shared values: the screen never re-renders per second. */
export function TimerRing({ model, now }: Props) {
  const { reduced } = useMotion();
  const startSv = useSharedValue(model.startedAt ?? 0);
  const goalSv = useSharedValue(model.goalMs);
  const activeSv = useSharedValue(model.startedAt === null ? 0 : 1);
  useEffect(() => {
    startSv.value = model.startedAt ?? 0;
    goalSv.value = model.goalMs;
    activeSv.value = model.startedAt === null ? 0 : 1;
  }, [model.startedAt, model.goalMs, startSv, goalSv, activeSv]);

  const elapsedSec = useDerivedValue(() => (activeSv.value ? Math.max(0, (now.value - startSv.value) / 1000) : 0));
  const progress = useDerivedValue(() =>
    activeSv.value ? Math.min(1, Math.max(0, (now.value - startSv.value) / goalSv.value)) : 0,
  );
  const digits = useDigits(elapsedSec);

  const breath = useSharedValue(11);
  useEffect(() => {
    if (reduced) {
      breath.value = 13;
      return;
    }
    breath.value = withRepeat(withSequence(withTiming(17, { duration: 1800 }), withTiming(11, { duration: 1800 })), -1);
  }, [reduced, breath]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - progress.value) }));
  const headProps = useAnimatedProps(() => {
    const a = progress.value * Math.PI * 2 - Math.PI / 2;
    return { cx: C + R * Math.cos(a), cy: C + R * Math.sin(a), opacity: activeSv.value };
  });
  const glowProps = useAnimatedProps(() => {
    const a = progress.value * Math.PI * 2 - Math.PI / 2;
    return { cx: C + R * Math.cos(a), cy: C + R * Math.sin(a), r: breath.value, opacity: activeSv.value };
  });

  const nowMs0 = model.startedAt === null ? 0 : model.elapsedMs / 1000;
  const initial = parts(nowMs0);
  const goalLine =
    model.endsAt === null
      ? t('tajmer.goal.idle', { h: model.goalHours })
      : t('tajmer.goal', { h: model.goalHours, time: clockOf(model.endsAt) });

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={ringA11y(model)}
      testID="timer-ring"
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <LinearGradient id="fastGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color.sunCtaTop} />
            <Stop offset="1" stopColor={color.sunCtaBottom} />
          </LinearGradient>
        </Defs>
        <Circle cx={C} cy={C} r={146} fill={color.glassFill} stroke={color.glassBorder} strokeWidth={1} />
        <Circle cx={C} cy={C} r={R} stroke="rgba(255,255,255,0.10)" strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={C}
          cy={C}
          r={R}
          stroke="url(#fastGrad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={[CIRC, CIRC]}
          rotation={-90}
          origin={`${C}, ${C}`}
          animatedProps={arcProps}
        />
        {milestones(model.goalHours).map((h) => {
          const a = (h / model.goalHours) * Math.PI * 2 - Math.PI / 2;
          const reached = model.elapsedMs >= h * 3600e3;
          return (
            <Circle
              key={h}
              cx={C + R * Math.cos(a)}
              cy={C + R * Math.sin(a)}
              r={4.5}
              fill={reached ? color.paper : 'rgba(246,242,234,0.35)'}
            />
          );
        })}
        <AnimatedCircle fill="rgba(255,200,110,0.30)" animatedProps={glowProps} />
        <AnimatedCircle r={8} fill={color.sun} animatedProps={headProps} />
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text variant="caption" tone="mist" style={styles.state}>
          {stateLabel(model.state)}
        </Text>
        <View style={styles.digits}>
          <Cell text={digits.h1} initial={initial.h.charAt(0)} size={46} />
          <Cell text={digits.h2} initial={initial.h.charAt(1)} size={46} />
          <Text style={styles.colon}>:</Text>
          <Cell text={digits.m1} initial={initial.m.charAt(0)} size={46} />
          <Cell text={digits.m2} initial={initial.m.charAt(1)} size={46} />
          <Text style={styles.colon}>:</Text>
          <Cell text={digits.s1} initial={initial.s.charAt(0)} size={46} />
          <Cell text={digits.s2} initial={initial.s.charAt(1)} size={46} />
        </View>
        <Text variant="caption" tone="mist">
          {goalLine}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 30 },
  state: { textAlign: 'center' },
  digits: { flexDirection: 'row', alignItems: 'center' },
  cell: {
    fontFamily: font.serif,
    color: color.paper,
    textAlign: 'center',
    padding: 0,
    margin: 0,
    fontVariant: ['tabular-nums'],
  },
  colon: { fontFamily: font.serif, fontSize: 40, lineHeight: 46, color: color.mist, marginHorizontal: 1 },
});
