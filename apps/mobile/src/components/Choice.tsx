import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { font } from '@/theme/fonts';
import { spring } from '@/theme/motion';
import { color } from '@/theme/tokens';
import { GlassCard } from './GlassCard';
import { haptics } from './haptics';
import { Icon } from './Icon';
import { Text } from './Text';
import { useMotion } from './useMotion';

type Props = {
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
};

export function Choice({ title, description, checked, disabled, onPress, testID }: Props) {
  const { reduced } = useMotion();
  const pop = useAnimatedStyle(() => {
    const s = checked ? 1 : 0.0001;
    return { transform: [{ scale: reduced ? s : withSpring(s, spring.pop) }], opacity: checked ? 1 : 0 };
  }, [checked, reduced]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={description ? `${title}. ${description}` : title}
      accessibilityState={{ checked, disabled: !!disabled }}
      disabled={disabled}
      testID={testID}
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      style={disabled ? styles.disabled : undefined}
    >
      <GlassCard style={checked ? styles.checkedBorder : undefined} contentStyle={styles.row}>
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          {description ? (
            <Text variant="small" tone="mist">
              {description}
            </Text>
          ) : null}
        </View>
        <View style={[styles.check, checked && styles.checkOn]}>
          <Animated.View style={pop}>
            <Icon name="check" size={16} color={color.sunInk} />
          </Animated.View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14, minHeight: 72 },
  texts: { flex: 1, gap: 4 },
  title: { fontFamily: font.serifMedium, fontSize: 23, lineHeight: 28 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: color.sun, borderColor: color.sun },
  checkedBorder: { borderColor: color.sun },
  disabled: { opacity: 0.45 },
});
