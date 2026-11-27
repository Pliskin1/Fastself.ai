import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { ScreenScroll } from './ScreenScroll';

type Props = { children?: ReactNode; testID?: string; sheet?: boolean; underHeader?: boolean };

export function KeyboardScreen({ children, testID, sheet = false, underHeader = false }: Props) {
  const scroll = (
    <ScreenScroll testID={testID} keyboardShouldPersistTaps="handled" sheet={sheet} underHeader={underHeader}>
      {children}
    </ScreenScroll>
  );
  // Sheets move with the keyboard natively, and a wrapper view would leave them blank (see ScreenScroll).
  if (sheet) return scroll;
  return (
    <KeyboardAvoidingView
      testID={testID ? `${testID}-kav` : undefined}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      {scroll}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
