import { MaterialIcons } from '@expo/vector-icons';
import { screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { Icon, iconMap } from './Icon';
import { renderUI } from './test-utils';

describe('Icon on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });
  afterEach(() => jest.restoreAllMocks());

  it('renders the MaterialIcons glyph for the name', async () => {
    await renderUI(<Icon name="calendar" />);
    const glyph = String.fromCodePoint(Number(MaterialIcons.glyphMap['calendar-month']));
    expect(screen.getByText(glyph)).toBeTruthy();
  });

  it('maps every icon to a real MaterialIcons glyph', () => {
    for (const entry of Object.values(iconMap)) {
      expect(MaterialIcons.glyphMap).toHaveProperty(entry.md);
    }
  });
});
