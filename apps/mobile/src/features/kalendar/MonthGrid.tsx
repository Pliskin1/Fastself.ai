import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { GlassCard, Text, useMotion } from '@/components';
import { font } from '@/theme/fonts';
import { color, level as levels } from '@/theme/tokens';
import { cellA11y, weekdayHeader, type CellModel } from './model';

const SUN_RGB = '255,200,110';

function Orb({ cell }: { cell: CellModel }) {
  const rgb = cell.orb === 'ramadan' ? SUN_RGB : levels[cell.level].rgb;
  const faint = cell.orb === 'level' && cell.level === 'mrsno';
  const id = `orb${cell.n}`;
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={id} cx="35%" cy="30%" r="75%">
          <Stop offset="0" stopColor={`rgb(${rgb})`} stopOpacity={faint ? 0.2 : 0.95} />
          <Stop offset="1" stopColor={`rgb(${rgb})`} stopOpacity={faint ? 0.08 : 0.55} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={40} height={40} rx={20} fill={`url(#${id})`} />
    </Svg>
  );
}

function Star() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" style={styles.star}>
      <Polygon
        points="12,1.5 15,8.5 22.5,9.2 16.8,14.2 18.6,21.7 12,17.8 5.4,21.7 7.2,14.2 1.5,9.2 9,8.5"
        fill={color.sunCtaTop}
      />
    </Svg>
  );
}

type CellProps = { cell: CellModel; today: boolean; selected: boolean; onPress: (n: number) => void; iso: string };

function Cell({ cell, today, selected, onPress, iso }: CellProps) {
  const dark = cell.orb === 'ramadan';
  return (
    <Pressable
      testID={`cal-${iso}`}
      accessibilityRole="button"
      accessibilityLabel={cellA11y(cell, today)}
      accessibilityState={{ selected }}
      onPress={() => onPress(cell.n)}
      style={styles.cell}
    >
      <View style={styles.orb}>
        <Orb cell={cell} />
        {cell.nafila ? <View style={styles.nafilaRing} /> : null}
        {today ? <View style={styles.todayRing} /> : null}
        {selected ? <View style={styles.selectedRing} /> : null}
        <Text style={[styles.num, dark && { color: color.sunInk }]}>{cell.day}</Text>
        {cell.slava ? <Star /> : null}
      </View>
    </Pressable>
  );
}

type Props = {
  cells: (CellModel | null)[];
  monthKey: string;
  /** -1 slides in from the left (previous month), 1 from the right. */
  direction: -1 | 1;
  today: number;
  selected: number;
  isoOf: (n: number) => string;
  onSelect: (n: number) => void;
};

export function MonthGrid({ cells, monthKey, direction, today, selected, isoOf, onSelect }: Props) {
  const { reduced, ms, ease } = useMotion();
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    x.value = reduced ? 0 : direction * 36;
    opacity.value = 0;
    x.value = withTiming(0, { duration: ms(420), easing: ease.expo });
    opacity.value = withTiming(1, { duration: ms(420), easing: ease.expo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  const slide = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: x.value }] }));

  return (
    <GlassCard contentStyle={styles.card} testID="month-card">
      <View style={styles.week}>
        {weekdayHeader().map((d) => (
          <Text key={d} variant="micro" tone="mist" style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      <Animated.View style={[styles.grid, slide]}>
        {cells.map((cell, i) =>
          cell ? (
            <Cell
              key={cell.n}
              cell={cell}
              iso={isoOf(cell.n)}
              today={cell.n === today}
              selected={cell.n === selected}
              onPress={onSelect}
            />
          ) : (
            <View key={`blank-${i}`} style={styles.cell} />
          ),
        )}
      </Animated.View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 6 },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center' },
  orb: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: font.sansSemi, fontSize: 15, color: color.paper },
  nafilaRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: color.teal,
    borderStyle: 'dashed',
  },
  todayRing: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: color.sun,
    shadowColor: color.sun,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  selectedRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: color.paper,
  },
  star: { position: 'absolute', top: -3, right: -3 },
});
