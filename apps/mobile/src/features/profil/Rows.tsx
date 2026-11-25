import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Caption, GlassCard, Icon, PressScale, Switch, Text } from '@/components';
import { layout } from '@/theme/tokens';

/** A glass list. Rows inside it share one card, separated by hairlines. */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Caption style={styles.groupTitle}>{title}</Caption>
      <GlassCard contentStyle={styles.list}>{children}</GlassCard>
    </View>
  );
}

type RowProps = { title: string; sub?: string; testID: string; last?: boolean };

function RowBody({ title, sub }: Pick<RowProps, 'title' | 'sub'>) {
  return (
    <View style={styles.text}>
      <Text variant="bodyStrong">{title}</Text>
      {sub ? <Caption>{sub}</Caption> : null}
    </View>
  );
}

export function LinkRow({
  title,
  sub,
  testID,
  last,
  onPress,
  disabled,
}: RowProps & { onPress?: () => void; disabled?: boolean }) {
  return (
    <PressScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${title}, ${sub}` : title}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={[styles.row, !last && styles.divider, disabled && styles.disabled]}
    >
      <RowBody title={title} sub={sub} />
      <Icon name="next" size={16} />
    </PressScale>
  );
}

export function SwitchRow({
  title,
  sub,
  testID,
  last,
  value,
  onValueChange,
}: RowProps & { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <RowBody title={title} sub={sub} />
      <Switch testID={testID} accessibilityLabel={title} value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  groupTitle: { paddingHorizontal: 6 },
  list: { paddingHorizontal: 16 },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.14)' },
  text: { flex: 1, gap: 2, minHeight: layout.minHit - 10, justifyContent: 'center' },
  disabled: { opacity: 0.45 },
});
