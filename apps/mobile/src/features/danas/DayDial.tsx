import { useEffect, useMemo } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Text, useMotion } from '@/components';
import { nowMs } from '@/lib/clock';
import { font } from '@/theme/fonts';
import { color, level as levels } from '@/theme/tokens';
import { dialA11y, type DialModel } from './model';

const SIZE = 320;
const C = SIZE / 2;
const R = 122;
const STROKE = 14;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const angle = (min: number): number => (min / 1440) * Math.PI * 2 - Math.PI / 2;
const point = (min: number, r: number) => ({ x: C + r * Math.cos(angle(min)), y: C + r * Math.sin(angle(min)) });

function arc(start: number, length: number, r: number): string {
  if (length >= 1440) {
    const a = point(start, r);
    const b = point(start + 720, r);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 1 1 ${b.x} ${b.y} A ${r} ${r} 0 1 1 ${a.x} ${a.y}`;
  }
  const a = point(start, r);
  const b = point(start + length, r);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${length > 720 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

function pad(v: number): string {
  'worklet';
  return (v < 10 ? '0' : '') + v;
}

function parts(remainingSec: number): { h: string; m: string; s: string } {
  'worklet';
  const total = Math.max(0, Math.floor(remainingSec));
  return { h: pad(Math.floor(total / 3600)), m: pad(Math.floor((total % 3600) / 60)), s: pad(total % 60) };
}

function useDigits(remaining: SharedValue<number>) {
  const h1 = useDerivedValue(() => parts(remaining.value).h.charAt(0));
  const h2 = useDerivedValue(() => parts(remaining.value).h.charAt(1));
  const m1 = useDerivedValue(() => parts(remaining.value).m.charAt(0));
  const m2 = useDerivedValue(() => parts(remaining.value).m.charAt(1));
  const s1 = useDerivedValue(() => parts(remaining.value).s.charAt(0));
  const s2 = useDerivedValue(() => parts(remaining.value).s.charAt(1));
  return { h1, h2, m1, m2, s1, s2 };
}

type CellProps = { text: SharedValue<string>; initial: string; size: number; style?: object };

/** One digit that is rewritten on the UI thread, in a fixed-width cell so the numbers never jitter. */
function Cell({ text, initial, size, style }: CellProps) {
  const props = useAnimatedProps(() => ({ text: text.value, defaultValue: text.value }) as unknown as TextInputProps);
  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      accessible={false}
      defaultValue={initial}
      animatedProps={props}
      style={[styles.cell, { width: size * 0.58, fontSize: size, lineHeight: size * 1.06 }, style]}
    />
  );
}

type Props = {
  model: DialModel;
  /** The plan day's local midnight, epoch ms. */
  dayStartMs: number;
  /** Current minute of the day, 0..1439. Changes once a minute. */
  minute: number;
  now: SharedValue<number>;
};

export function DayDial({ model, dayStartMs, minute, now }: Props) {
  const { reduced } = useMotion();
  const endSec = useSharedValue(0);
  const target = model.targetMin;
  useEffect(() => {
    endSec.value = target === null ? 0 : dayStartMs / 1000 + target * 60;
  }, [target, dayStartMs, endSec]);

  const remaining = useDerivedValue(() => Math.max(0, endSec.value - now.value / 1000));
  const digits = useDigits(remaining);

  const initial = parts(target === null ? 0 : dayStartMs / 1000 + target * 60 - nowMs() / 1000);
  const remainingMin = target === null ? 0 : Math.max(0, target - minute);

  const draw = useSharedValue(reduced ? 0 : 1);
  const breath = useSharedValue(24);
  useEffect(() => {
    if (reduced) {
      draw.value = 0;
      breath.value = 28;
      return;
    }
    draw.value = 1;
    draw.value = withDelay(180, withTiming(0, { duration: 1500 }));
    breath.value = withRepeat(withSequence(withTiming(34, { duration: 2000 }), withTiming(24, { duration: 2000 })), -1);
  }, [reduced, draw, breath]);
  const phaseLen0 = model.phaseStart === null ? 0 : (((minute - model.phaseStart) % 1440) + 1440) % 1440;
  const arcLength = (R - 12) * (phaseLen0 / 1440) * Math.PI * 2;
  const lengthSv = useSharedValue(arcLength);
  useEffect(() => {
    lengthSv.value = arcLength;
  }, [arcLength, lengthSv]);
  const drawProps = useAnimatedProps(() => ({ strokeDashoffset: lengthSv.value * draw.value }));
  const sunGlow = useAnimatedProps(() => ({ r: breath.value / 2.2 }));

  const lvl = levels[model.level];
  const eat = model.eat;
  const phaseStart = model.phaseStart;
  const phaseLen = phaseStart === null ? 0 : (((minute - phaseStart) % 1440) + 1440) % 1440;
  const sun = point(minute, R);

  const ticks = useMemo(
    () =>
      Array.from({ length: 96 }, (_, i) => {
        const min = i * 15;
        const major = i % 4 === 0;
        const long = i % 24 === 0;
        const len = long ? 12 : major ? 8 : 4;
        const a = point(min, 150);
        const b = point(min, 150 - len);
        return { key: i, a, b, major };
      }),
    [],
  );

  const numerals = useMemo(
    () => [0, 3, 6, 9, 12, 15, 18, 21].map((h) => ({ h, p: point(h * 60, 100), big: h % 6 === 0 })),
    [],
  );

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={dialA11y(model, remainingMin)}
      testID="day-dial"
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <LinearGradient id="eatGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color.sunCtaTop} />
            <Stop offset="1" stopColor={color.sunCtaBottom} />
          </LinearGradient>
        </Defs>
        <Circle cx={C} cy={C} r={156} fill={color.glassFill} stroke={color.glassBorder} strokeWidth={1} />
        {ticks.map(({ key, a, b, major }) => (
          <Line
            key={key}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={major ? 'rgba(246,242,234,0.55)' : 'rgba(246,242,234,0.22)'}
            strokeWidth={major ? 1.4 : 1}
          />
        ))}
        {numerals.map(({ h, p, big }) => (
          <SvgText
            key={h}
            x={p.x}
            y={p.y + (big ? 6 : 4)}
            fill={big ? color.paper : color.mist}
            fontFamily={big ? font.serifItalic : font.serif}
            fontSize={big ? 17 : 12}
            textAnchor="middle"
          >
            {pad(h)}
          </SvgText>
        ))}

        {model.hasWindow && eat ? (
          <>
            <Path
              d={arc(eat.start + eat.length, 1440 - eat.length, R)}
              stroke="rgba(158,197,255,0.26)"
              strokeWidth={STROKE}
              fill="none"
            />
            <Path
              d={arc(eat.start, eat.length, R)}
              stroke="rgba(255,181,71,0.22)"
              strokeWidth={STROKE + 8}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d={arc(eat.start, eat.length, R)}
              stroke="url(#eatGrad)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
            />
            {[eat.start, eat.start + eat.length].map((m) => {
              const p = point(m, R);
              return <Circle key={m} cx={p.x} cy={p.y} r={4} fill={color.paper} />;
            })}
            {phaseStart !== null && phaseLen > 0 ? (
              <AnimatedPath
                d={arc(phaseStart, phaseLen, R - 12)}
                strokeDasharray={[arcLength + 1, arcLength + 1]}
                animatedProps={drawProps}
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
            ) : null}
            <G>
              <AnimatedCircle cx={sun.x} cy={sun.y} fill="rgba(255,200,110,0.30)" animatedProps={sunGlow} />
              <Circle cx={sun.x} cy={sun.y} r={7} fill={color.sun} />
            </G>
          </>
        ) : (
          <Circle cx={C} cy={C} r={R} stroke={lvl.hex} strokeOpacity={0.85} strokeWidth={STROKE} fill="none" />
        )}
      </Svg>

      <View style={styles.center} pointerEvents="none">
        {model.hasWindow ? (
          <>
            <Text variant="caption" tone="mist">
              {model.label}
            </Text>
            <View style={styles.digits}>
              <Cell text={digits.h1} initial={initial.h.charAt(0)} size={62} />
              <Cell text={digits.h2} initial={initial.h.charAt(1)} size={62} />
              <Text style={styles.colon}>:</Text>
              <Cell text={digits.m1} initial={initial.m.charAt(0)} size={62} />
              <Cell text={digits.m2} initial={initial.m.charAt(1)} size={62} />
              <View style={styles.seconds}>
                <Cell text={digits.s1} initial={initial.s.charAt(0)} size={20} style={styles.secondsText} />
                <Cell text={digits.s2} initial={initial.s.charAt(1)} size={20} style={styles.secondsText} />
              </View>
            </View>
            <Text variant="caption" tone="mist">
              {model.sub}
            </Text>
          </>
        ) : (
          <Text style={styles.word} maxFontSizeMultiplier={1.4}>
            {model.word}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 2 },
  digits: { flexDirection: 'row', alignItems: 'flex-end' },
  cell: { padding: 0, color: color.paper, fontFamily: font.serif, textAlign: 'center' },
  colon: {
    fontFamily: font.serif,
    fontSize: 62,
    lineHeight: 62,
    color: color.paper,
    width: 62 * 0.26,
    textAlign: 'center',
  },
  seconds: { flexDirection: 'row', marginLeft: 4, marginBottom: 6, opacity: 0.7 },
  secondsText: { color: color.paper },
  word: { fontFamily: font.serifItalic, fontSize: 56, lineHeight: 62, color: color.paper },
});
