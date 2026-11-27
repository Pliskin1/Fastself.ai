import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { ScreenScroll } from './ScreenScroll';

type Props = { children?: ReactNode; testID?: string; sheet?: boolean };

export function KeyboardScreen({ children, testID, sheet = false }: Props) {
  return (
    <KeyboardAvoidingView
      testID={testID ? `${testID}-kav` : undefined}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScreenScroll testID={testID} keyboardShouldPersistTaps="handled" sheet={sheet}>
        {children}
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
