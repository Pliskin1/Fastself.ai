import { fireEvent, render, screen } from '@testing-library/react-native';
import { getSettings } from '@/store/settings';
import { fixtureSettings, withProviders } from '@/test/utils';
import { AlergijePicker } from '../AlergijePicker';
import { PraksePicker } from '../PraksePicker';

describe('PraksePicker', () => {
  it('writes the chosen practice, strictness and slava to the store', async () => {
    await render(withProviders(<PraksePicker />, { settings: fixtureSettings() }));
    await fireEvent.press(screen.getByTestId('choice-orthodox'));
    expect(getSettings().practices.orthodox).toBe(true);
    await fireEvent.press(screen.getByTestId('seg-strog-ulje'));
    expect(getSettings().strictness).toBe('ulje');
    await fireEvent.press(screen.getByTestId('btn-slava'));
    await fireEvent.press(screen.getByTestId('chip-slava-nikola'));
    expect(getSettings().slavaId).toBe('nikola');
    await fireEvent.press(screen.getByTestId('choice-if'));
    await fireEvent.press(screen.getByTestId('seg-if-16'));
    expect(getSettings().practices.ifOn).toBe(true);
    expect(getSettings().ifPlan).toBe(16);
  });

  it('disables IF for a minor', async () => {
    await render(withProviders(<PraksePicker />, { settings: fixtureSettings({ minor: true }) }));
    expect(screen.getByTestId('choice-if').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('choice-if'));
    expect(getSettings().practices.ifOn).toBe(false);
  });
});

describe('AlergijePicker', () => {
  it('adds a typed word on submit and removes it again', async () => {
    await render(withProviders(<AlergijePicker />, { settings: fixtureSettings() }));
    const input = screen.getByTestId('input-allergen');
    await fireEvent.changeText(input, 'kivi');
    await fireEvent(input, 'submitEditing');
    expect(getSettings().customAvoid).toEqual(['kivi']);
    await fireEvent.press(screen.getByTestId('chip-my-kivi'));
    expect(getSettings().customAvoid).toEqual([]);
  });

  it('adds an EU allergen from the common list', async () => {
    await render(withProviders(<AlergijePicker />, { settings: fixtureSettings() }));
    await fireEvent.press(screen.getByTestId('chip-add-jaja'));
    expect(getSettings().allergies).toEqual(['jaja']);
  });
});
