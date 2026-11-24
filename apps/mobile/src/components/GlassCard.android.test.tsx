import { screen } from '@testing-library/react-native';
import { Platform, StyleSheet, Text } from 'react-native';
import { GlassCard } from './GlassCard';
import { renderUI } from './test-utils';

describe('GlassCard on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });
  afterEach(() => jest.restoreAllMocks());

  it('uses a solid fill and keeps the border', async () => {
    await renderUI(
      <GlassCard testID="card">
        <Text>x</Text>
      </GlassCard>,
    );
    const style = StyleSheet.flatten(screen.getByTestId('card').props.style);
    expect(style.backgroundColor).toBe('rgba(22,26,58,0.82)');
    expect(style.borderWidth).toBe(1);
  });
});
