import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, layout } from '@/theme/tokens';
import { SkyBackground } from './SkyBackground';

type Props = {
  children?: ReactNode;
  /** Extra bottom space, e.g. native tab bar height. */
  bottomInset?: number;
  testID?: string;
  /** Extra content style. A `paddingTop` here is added below the status bar, never in place of it. */
  contentStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  /** Draw the sky behind this screen. Needed on tab screens: the native tab container hides the root sky. */
  sky?: boolean;
  /** Inside a formSheet: no status bar inset and no top fade (the sheet starts below the status bar). */
  sheet?: boolean;
  /** A header above already covers the status bar: no top inset and no top fade. */
  underHeader?: boolean;
};

const TOP_GAP = 12;
const SHEET_TOP = 24;
const FADE = ['rgba(3,4,13,0.92)', 'rgba(3,4,13,0.55)', 'rgba(3,4,13,0)'] as const;

export function ScreenScroll({
  children,
  bottomInset = 0,
  testID,
  contentStyle,
  keyboardShouldPersistTaps,
  sky = false,
  sheet = false,
  underHeader = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const { paddingTop: extraTop, ...rest } = StyleSheet.flatten(contentStyle) ?? {};
  const covered = sheet || underHeader;
  const gap = typeof extraTop === 'number' ? extraTop : TOP_GAP;
  const top = sheet ? SHEET_TOP : (underHeader ? 0 : insets.top) + gap;
  const bottom = (sheet ? 0 : insets.bottom) + bottomInset + 24;

  const scroll = (
    <ScrollView
      testID={testID}
      style={sheet ? styles.sheet : styles.fill}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode="interactive"
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustKeyboardInsets={sheet}
      scrollIndicatorInsets={{ top: covered ? 0 : insets.top, bottom: bottom - 24 }}
      contentContainerStyle={[
        { paddingTop: top, paddingBottom: bottom, paddingHorizontal: layout.screenPadding, gap: layout.sectionGap },
        rest,
      ]}
    >
      {children}
    </ScrollView>
  );
  // A native formSheet gives a flex:1 wrapper no height, which leaves the sheet blank on iOS: the ScrollView has to
  // be the sheet's root view.
  if (sheet) return scroll;

  return (
    <View style={styles.fill}>
      {sky ? <SkyBackground /> : null}
      {scroll}
      {underHeader ? null : (
        <LinearGradient
          pointerEvents="none"
          colors={FADE}
          locations={[0, 0.6, 1]}
          style={[styles.fade, { height: insets.top + 20 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: { backgroundColor: color.ink },
  fade: { position: 'absolute', top: 0, left: 0, right: 0 },
});
