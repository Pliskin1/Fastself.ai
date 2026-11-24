import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { font } from '@/theme/fonts';
import { color, layout, radius } from '@/theme/tokens';
import { Caption } from './Text';

type Props = TextInputProps & { label: string; error?: string };

export function TextField({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Caption>{label}</Caption>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="rgba(212,214,230,0.55)"
        selectionColor={color.sun}
        keyboardAppearance="dark"
        {...rest}
        style={[styles.input, error ? styles.invalid : null, style]}
      />
      {error ? <Caption style={styles.error}>{error}</Caption> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: {
    minHeight: layout.minHit + 8,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: color.glassBorder,
    backgroundColor: color.glassFill,
    color: color.paper,
    fontFamily: font.sans,
    fontSize: 16,
  },
  invalid: { borderColor: color.ember },
  error: { color: color.emberInk },
});
