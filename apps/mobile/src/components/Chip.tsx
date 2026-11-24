import { Pressable, StyleSheet, View } from 'react-native';
import { color, layout, radius } from '@/theme/tokens';
import { haptics } from './haptics';
import { Icon } from './Icon';
import { Text } from './Text';

export type ChipVariant = 'yes' | 'no' | 'toggle' | 'add' | 'remove' | 'readonly';

type Props = {
  label: string;
  variant?: ChipVariant;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
};

const tint: Record<ChipVariant, { bg: string; border: string; ink: string }> = {
  yes: { bg: 'rgba(98,214,196,0.20)', border: 'rgba(98,214,196,0.45)', ink: color.tealInk },
  no: { bg: 'rgba(255,143,115,0.20)', border: 'rgba(255,143,115,0.45)', ink: color.emberInk },
  toggle: { bg: 'rgba(255,255,255,0.08)', border: color.glassBorder, ink: color.paper },
  add: { bg: 'transparent', border: 'rgba(255,255,255,0.3)', ink: color.sunLink },
  remove: { bg: 'rgba(255,143,115,0.20)', border: 'rgba(255,143,115,0.45)', ink: color.emberInk },
  readonly: { bg: 'rgba(255,255,255,0.08)', border: color.glassBorder, ink: color.mist },
};

export function Chip({ label, variant = 'readonly', selected = false, onPress, testID, accessibilityLabel }: Props) {
  const interactive = variant !== 'readonly' && !!onPress;
  const t = variant === 'toggle' && selected ? { bg: color.sun, border: color.sun, ink: color.sunInk } : tint[variant];
  const body = (
    <View
      style={[styles.chip, { backgroundColor: t.bg, borderColor: t.border }, interactive ? styles.tall : styles.short]}
    >
      {variant === 'add' ? <Icon name="plus" size={14} color={t.ink} /> : null}
      <Text variant="small" style={{ color: t.ink }}>
        {label}
      </Text>
      {variant === 'remove' ? <Icon name="close" size={14} color={t.ink} /> : null}
    </View>
  );
  if (!interactive) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel ?? label} testID={testID}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole={variant === 'toggle' ? 'checkbox' : 'button'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={variant === 'toggle' ? { checked: selected } : undefined}
      testID={testID}
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  tall: { minHeight: layout.minHit },
  short: { minHeight: 32 },
});
