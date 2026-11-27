import type { ReactNode } from 'react';
import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { color } from '@/theme/tokens';
import { font } from '@/theme/fonts';

export type TextVariant = 'display' | 'hero' | 'dial' | 'title' | 'body' | 'bodyStrong' | 'small' | 'caption' | 'micro';

// Bodoni Moda (display, hero, dial, title) needs about 1.45 x the size (its natural line is 1.525), or iOS cuts the tops of the letters.
const variants: Record<TextVariant, TextStyle> = {
  display: { fontFamily: font.serifMedium, fontSize: 40, lineHeight: 58, letterSpacing: -0.6 },
  hero: { fontFamily: font.serif, fontSize: 44, lineHeight: 64 },
  dial: { fontFamily: font.serif, fontSize: 62, lineHeight: 90, fontVariant: ['tabular-nums'] },
  title: { fontFamily: font.serifMedium, fontSize: 22, lineHeight: 32 },
  body: { fontFamily: font.sans, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: font.sansSemi, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: font.sans, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.sans, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: font.sansSemi, fontSize: 11, lineHeight: 14 },
};

const capped: TextVariant[] = ['display', 'hero', 'dial'];

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  tone?: 'paper' | 'mist' | 'sun' | 'ink';
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
};

const tones = { paper: color.paper, mist: color.mist, sun: color.sun, ink: color.ink };

export function Text({ variant = 'body', tone = 'paper', style, ...rest }: AppTextProps) {
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={capped.includes(variant) ? 1.6 : undefined}
      {...rest}
      style={[variants[variant], { color: tones[tone] }, style]}
    />
  );
}

export type TypeProps = Omit<AppTextProps, 'variant'>;

export const Display = (p: TypeProps) => <Text accessibilityRole="header" {...p} variant="display" />;
export const Title = (p: TypeProps) => <Text accessibilityRole="header" {...p} variant="title" />;
export const Body = (p: TypeProps) => <Text {...p} variant="body" />;
export const Caption = (p: TypeProps) => <Text tone="mist" {...p} variant="caption" />;
