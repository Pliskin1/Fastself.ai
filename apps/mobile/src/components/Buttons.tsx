import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { font } from '@/theme/fonts';
import { color, layout, radius } from '@/theme/tokens';
import { GlassCard } from './GlassCard';
import { haptics } from './haptics';
import { Icon, type IconName } from './Icon';
import { PressScale } from './PressScale';
import { Text } from './Text';

type ButtonProps = {
  label: string;
  tone?: 'teal';
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, onPress, disabled, testID, style }: ButtonProps) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      testID={testID}
      onPress={() => {
        haptics.impactLight();
        onPress?.();
      }}
      style={[styles.primaryShadow, disabled && styles.disabled, style]}
    >
      <LinearGradient colors={[color.sunCtaTop, color.sunCtaBottom]} style={styles.primary}>
        <Text variant="bodyStrong" style={styles.primaryLabel}>
          {label}
        </Text>
      </LinearGradient>
    </PressScale>
  );
}

export function SecondaryButton({ label, onPress, disabled, testID, style, tone }: ButtonProps) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      testID={testID}
      onPress={onPress}
      style={[disabled && styles.disabled, style]}
    >
      <GlassCard
        radius={radius.button}
        style={tone === 'teal' ? styles.tealBorder : undefined}
        contentStyle={styles.secondary}
      >
        <Text variant="bodyStrong" style={tone === 'teal' ? { color: color.tealInk } : undefined}>
          {label}
        </Text>
      </GlassCard>
    </PressScale>
  );
}

export function LinkButton({ label, onPress, disabled, testID, style }: ButtonProps) {
  return (
    <PressScale
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      testID={testID}
      onPress={onPress}
      style={[styles.link, disabled && styles.disabled, style]}
    >
      <Text variant="bodyStrong" style={styles.linkLabel}>
        {label}
      </Text>
    </PressScale>
  );
}

type IconButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  testID?: string;
};

export function IconButton({ icon, accessibilityLabel, onPress, testID }: IconButtonProps) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      style={styles.iconButton}
    >
      <GlassCard radius={layout.minHit / 2} style={styles.iconButton} contentStyle={styles.iconInner}>
        <Icon name={icon} size={20} />
      </GlassCard>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  primaryShadow: {
    shadowColor: 'rgb(255,170,60)',
    shadowOpacity: 0.38,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  primary: { height: 56, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  primaryLabel: { color: color.sunInk, fontSize: 17, fontFamily: font.sansBold },
  secondary: { height: 54, alignItems: 'center', justifyContent: 'center' },
  link: { minHeight: layout.minHit, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { color: color.sunLink, fontFamily: font.sansBold },
  tealBorder: { borderColor: color.teal },
  disabled: { opacity: 0.45 },
  iconButton: { width: layout.minHit, height: layout.minHit },
  iconInner: { width: layout.minHit - 2, height: layout.minHit - 2, alignItems: 'center', justifyContent: 'center' },
});
