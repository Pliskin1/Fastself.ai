import { MaterialIcons } from '@expo/vector-icons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Platform } from 'react-native';
import { color } from '@/theme/tokens';

export const iconMap = {
  today: { sf: 'sun.horizon', md: 'wb-twilight' },
  calendar: { sf: 'calendar', md: 'calendar-month' },
  plan: { sf: 'list.bullet', md: 'list' },
  timer: { sf: 'timer', md: 'timer' },
  profile: { sf: 'person.crop.circle', md: 'account-circle' },
  sync: { sf: 'cloud', md: 'cloud' },
  back: { sf: 'chevron.left', md: 'chevron-left' },
  next: { sf: 'chevron.right', md: 'chevron-right' },
  expand: { sf: 'chevron.down', md: 'expand-more' },
  check: { sf: 'checkmark', md: 'check' },
  close: { sf: 'xmark', md: 'close' },
  plus: { sf: 'plus', md: 'add' },
  minus: { sf: 'minus', md: 'remove' },
  edit: { sf: 'pencil', md: 'edit' },
  privacy: { sf: 'shield.checkered', md: 'verified-user' },
} as const satisfies Record<string, { sf: SFSymbol; md: keyof typeof MaterialIcons.glyphMap }>;

export type IconName = keyof typeof iconMap;

type Props = { name: IconName; size?: number; color?: string };

export function Icon({ name, size = 22, color: tint = color.paper }: Props) {
  const entry = iconMap[name];
  if (Platform.OS === 'ios') {
    return <SymbolView name={entry.sf} size={size} tintColor={tint} weight="medium" />;
  }
  return <MaterialIcons name={entry.md} size={size} color={tint} />;
}
