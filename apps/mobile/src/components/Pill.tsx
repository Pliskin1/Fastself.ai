import { StyleSheet, View } from 'react-native';
import { color, level as levels, type LevelKey } from '@/theme/tokens';
import { Text } from './Text';

type Props = {
  level?: LevelKey;
  tone?: 'teal' | 'ember' | 'neutral';
  label?: string;
  solid?: boolean;
  testID?: string;
};

const tones = {
  teal: { bg: 'rgba(98,214,196,0.20)', ink: color.tealInk },
  ember: { bg: 'rgba(255,143,115,0.20)', ink: color.emberInk },
  neutral: { bg: 'rgba(255,255,255,0.10)', ink: color.mist },
};

export function Pill({ level, tone = 'neutral', label, solid = false, testID }: Props) {
  let bg: string;
  let ink: string;
  let text: string;
  let border: string | undefined;
  if (level) {
    const l = levels[level];
    text = label ?? l.short;
    bg = solid ? l.hex : `rgba(${l.rgb},0.20)`;
    ink = solid ? color.ink : l.ink;
    if (level === 'mrsno') border = 'rgba(255,255,255,0.24)';
  } else {
    text = label ?? '';
    bg = tones[tone].bg;
    ink = tones[tone].ink;
  }
  return (
    <View
      accessible
      accessibilityLabel={text}
      testID={testID}
      style={[styles.pill, { backgroundColor: bg }, border ? { borderWidth: 1, borderColor: border } : null]}
    >
      <Text variant="small" style={{ color: ink }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center' },
});
