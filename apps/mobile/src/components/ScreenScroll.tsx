import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '@/theme/tokens';

type Props = {
  children?: ReactNode;
  /** Extra bottom space, e.g. native tab bar height. */
  bottomInset?: number;
  testID?: string;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
};

export function ScreenScroll({ children, bottomInset = 0, testID, contentStyle, keyboardShouldPersistTaps }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      testID={testID}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + bottomInset + 24,
          paddingHorizontal: layout.screenPadding,
          gap: layout.sectionGap,
        },
        contentStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}
