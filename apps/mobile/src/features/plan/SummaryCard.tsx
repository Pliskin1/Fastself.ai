import { StyleSheet, View } from 'react-native';
import { Caption, GlassCard, Text } from '@/components';
import { t } from '@/copy/sr';
import type { RangeDays, SummaryItem } from './model';

type Props = { range: RangeDays; items: SummaryItem[] };

export function SummaryCard({ range, items }: Props) {
  if (items.length === 0) return null;
  const summary = t(`plan.summary.${range}`);
  return (
    <GlassCard testID="plan-summary" contentStyle={styles.card}>
      <Caption>{summary}</Caption>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.bar}>
        {items.map((item) => (
          <View key={item.key} style={{ flex: item.n, height: 12, backgroundColor: item.color }} />
        ))}
      </View>
      <View style={styles.stats}>
        {items.map((item) => {
          const count = String(item.n);
          return (
            <View key={item.key} accessible accessibilityLabel={item.text} style={styles.stat}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text variant="small">
                <Text variant="small" style={styles.count}>
                  {count}
                </Text>
                {item.text.slice(count.length)}
              </Text>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, gap: 12 },
  bar: { flexDirection: 'row', gap: 3, height: 12, borderRadius: 6, overflow: 'hidden' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  count: { fontWeight: '700', fontVariant: ['tabular-nums'] },
});
