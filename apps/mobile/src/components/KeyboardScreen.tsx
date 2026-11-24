import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { ScreenScroll } from './ScreenScroll';

type Props = { children?: ReactNode; testID?: string };

export function KeyboardScreen({ children, testID }: Props) {
  return (
    <KeyboardAvoidingView
      testID={testID ? `${testID}-kav` : undefined}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScreenScroll testID={testID} keyboardShouldPersistTaps="handled">
        {children}
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
