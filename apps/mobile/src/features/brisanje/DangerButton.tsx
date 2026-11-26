import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PressScale, Text, haptics } from '@/components';
import { font } from '@/theme/fonts';
import { color, layout, radius } from '@/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The žar confirm button of a destructive action, built like `PrimaryButton`. Flat ember fill: there are no ember
 * gradient tokens. The label wraps and the button grows with Dynamic Type.
 */
export function DangerButton({ label, onPress, disabled, testID, style }: Props) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      testID={testID}
      onPress={() => {
        haptics.warning();
        onPress?.();
      }}
      style={[styles.shadow, disabled && styles.disabled, style]}
    >
      <View style={styles.fill}>
        <Text variant="bodyStrong" style={styles.label}>
          {label}
        </Text>
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: color.ember,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  fill: {
    minHeight: layout.minHit,
    paddingVertical: 17,
    paddingHorizontal: layout.screenPadding,
    borderRadius: radius.button,
    backgroundColor: color.ember,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: color.sunInk, fontFamily: font.sansBold, textAlign: 'center' },
  disabled: { opacity: 0.45 },
});
