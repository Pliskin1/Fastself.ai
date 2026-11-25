import { StyleSheet, View } from 'react-native';
import { Pill, Text } from '@/components';
import { t } from '@/copy/sr';
import { color } from '@/theme/tokens';
import type { RowModel } from './model';

// The Ramadan pill is the gold of the sun token at the same 0.20 alpha the level pills use.
const RAMADAN_BG = 'rgba(255,200,110,0.20)';

function RowPill({ row }: { row: RowModel }) {
  if (row.tone === 'level' && row.level) return <Pill level={row.level} label={row.title} />;
  if (row.tone === 'ramadan') {
    return (
      <View style={[styles.pill, { backgroundColor: RAMADAN_BG }]}>
        <Text variant="small" style={{ color: color.sunLink }}>
          {row.title}
        </Text>
      </View>
    );
  }
  return <Pill level="mrsno" label={row.title} />;
}

function Row({ row }: { row: RowModel }) {
  return (
    <View accessible accessibilityLabel={row.label} testID={`plan-row-${row.n}`} style={styles.row}>
      <View style={styles.when}>
        <Text variant="micro" style={[styles.weekday, { color: row.isToday ? color.sun : color.mist }]}>
          {row.weekday}
        </Text>
        <Text variant="small" style={styles.date}>
          {row.date}
        </Text>
      </View>
      <View style={styles.nodeCol}>
        <View
          style={[
            styles.node,
            {
              backgroundColor: row.nodeColor,
              // boxShadow draws the glow on Android too; shadowColor alone is iOS only.
              boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 12, color: row.nodeColor }],
            },
          ]}
        />
      </View>
      <View style={styles.body}>
        <RowPill row={row} />
        {row.line ? (
          <Text variant="caption" tone="mist">
            {row.line}
          </Text>
        ) : null}
        {row.meals.map((meal) => (
          <Text key={meal} variant="small">
            {meal}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function Timeline({ rows }: { rows: RowModel[] }) {
  return (
    <View accessibilityLabel={t('plan.days.label')} testID="plan-timeline" style={styles.wrap}>
      <View pointerEvents="none" style={styles.line} />
      {rows.map((row) => (
        <Row key={row.n} row={row} />
      ))}
    </View>
  );
}

const PAD = 4;
const WHEN_WIDTH = 52;
const NODE_COL = 24;

const styles = StyleSheet.create({
  wrap: { paddingLeft: PAD },
  // Runs through the centre of the nodes.
  line: {
    position: 'absolute',
    left: PAD + WHEN_WIDTH + NODE_COL / 2 - 0.5,
    top: 18,
    bottom: 18,
    width: 1,
    backgroundColor: color.glassBorder,
  },
  row: { flexDirection: 'row', paddingVertical: 12 },
  when: { width: WHEN_WIDTH, gap: 2 },
  weekday: { fontWeight: '700' },
  date: { fontVariant: ['tabular-nums'] },
  nodeCol: { width: NODE_COL, alignItems: 'center', paddingTop: 6 },
  node: { width: 9, height: 9, borderRadius: 5 },
  body: { flex: 1, minWidth: 0, paddingLeft: 6, gap: 6 },
  pill: { alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center' },
});
