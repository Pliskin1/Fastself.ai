import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '@/theme/tokens';
import { SkyBackground } from './SkyBackground';

type Props = {
  children?: ReactNode;
  /** Extra bottom space, e.g. native tab bar height. */
  bottomInset?: number;
  testID?: string;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  /** Draw the sky behind this screen. Needed on tab screens: the native tab container hides the root sky. */
  sky?: boolean;
};

export function ScreenScroll({
  children,
  bottomInset = 0,
  testID,
  contentStyle,
  keyboardShouldPersistTaps,
  sky = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const scroll = (
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
  if (!sky) return scroll;
  return (
    <View style={styles.fill}>
      <SkyBackground />
      {scroll}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
