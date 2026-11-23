import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { spring } from '@/theme/motion';
import { color, layout, radius } from '@/theme/tokens';
import { haptics } from './haptics';
import { Text } from './Text';
import { useMotion } from './useMotion';

export type SegmentedItem<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (key: T) => void;
  testID?: string;
};

export function Segmented<T extends string>({ items, value, onChange, testID }: Props<T>) {
  const { reduced } = useMotion();
  const [width, setWidth] = useState(0);
  const itemWidth = items.length ? (width - 8) / items.length : 0;
  const index = Math.max(
    0,
    items.findIndex((i) => i.key === value),
  );

  const indicator = useAnimatedStyle(() => {
    const x = 4 + index * itemWidth;
    return { transform: [{ translateX: reduced ? x : withSpring(x, spring.pop) }], width: itemWidth };
  }, [index, itemWidth, reduced]);

  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      style={styles.wrap}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.indicator, indicator]} />
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            testID={testID ? `${testID}-${item.key}` : undefined}
            style={styles.item}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(item.key);
            }}
          >
            <Text variant="bodyStrong" tone={selected ? 'ink' : 'paper'} numberOfLines={2} style={styles.label}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.input + 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: color.glassBorder,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: radius.input,
    backgroundColor: color.paper,
  },
  item: { flex: 1, minHeight: layout.minHit, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  label: { textAlign: 'center' },
});
