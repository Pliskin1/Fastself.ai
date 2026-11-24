import { fireEvent, render, screen } from '@testing-library/react-native';
import { Choice } from './Choice';
import { PrimaryButton } from './Buttons';
import { Segmented } from './Segmented';
import { Switch } from './Switch';

describe('controls', () => {
  it('Switch toggles and exposes checked state', async () => {
    const onValueChange = jest.fn();
    await render(<Switch value={false} onValueChange={onValueChange} accessibilityLabel="s" />);
    const sw = screen.getByRole('switch');
    expect(sw.props.accessibilityState.checked).toBe(false);
    await fireEvent.press(sw);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('Segmented fires onChange only for a different item', async () => {
    const onChange = jest.fn();
    const items = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ];
    await render(<Segmented items={items} value="a" onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('A'));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('B'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('Choice reports checked and presses', async () => {
    const onPress = jest.fn();
    await render(<Choice title="T" checked onPress={onPress} />);
    const c = screen.getByRole('radio');
    expect(c.props.accessibilityState.checked).toBe(true);
    await fireEvent.press(c);
    expect(onPress).toHaveBeenCalled();
  });

  it('PrimaryButton ignores presses when disabled', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Go" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
