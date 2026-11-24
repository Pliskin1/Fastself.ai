import { screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { KeyboardScreen } from './KeyboardScreen';
import { renderUI } from './test-utils';

describe('KeyboardScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('has no avoiding behavior on Android (resize mode handles it)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await renderUI(<KeyboardScreen testID="ks" />);
    expect(screen.getByTestId('ks-kav').props.behavior).toBeUndefined();
  });
});
