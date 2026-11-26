import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PressScale, Text, haptics } from '@/components';
import { font } from '@/theme/fonts';
import { color, layout, radius } from '@/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Shows a small spinner next to the label while the action runs. Screen readers hear only the label. */
  busy?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The žar confirm button of a destructive action, built like `PrimaryButton`. Flat ember fill: there are no ember
 * gradient tokens. The label wraps and the button grows with Dynamic Type.
 */
export function DangerButton({ label, onPress, disabled, busy, testID, style }: Props) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
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
        {busy ? (
          <ActivityIndicator
            testID={testID ? `${testID}-busy` : undefined}
            size="small"
            color={color.sunInk}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : null}
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
  // Android draws `elevation` from the outline of the view's own background, so it sits on the opaque fill: on the
  // transparent wrapper (where PrimaryButton has it) the outline is invisible and Android draws no shadow.
  fill: {
    minHeight: layout.minHit,
    paddingVertical: 17,
    paddingHorizontal: layout.screenPadding,
    borderRadius: radius.button,
    backgroundColor: color.ember,
    elevation: 6,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flexShrink: 1, color: color.sunInk, fontFamily: font.sansBold, textAlign: 'center' },
  disabled: { opacity: 0.45 },
});
