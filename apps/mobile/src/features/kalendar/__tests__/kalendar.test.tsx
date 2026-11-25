import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import KalendarScreen from '@/app/(tabs)/kalendar';
import { at, fixtureSettings, withProviders } from '@/test/utils';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const open = (iso: string, patch = {}) =>
  render(
    withProviders(<KalendarScreen />, {
      settings: fixtureSettings({ orthodox: true, strictness: 'ulje', slavaId: 'nikola', ...patch }),
      now: at(iso),
    }),
  );

describe('Kalendar', () => {
  it('December 2026: 31 cells, 4.12 is riba, selecting it shows the feast', async () => {
    await open('2026-12-02T16:30');
    expect(screen.getByText('Decembar')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
    expect(screen.getAllByTestId(/^cal-2026-12-/)).toHaveLength(31);
    expect(screen.getByTestId('cal-2026-12-02').props.accessibilityLabel).toBe('2. decembar, Post na ulju, danas');
    expect(screen.queryByTestId('btn-cal-today')).toBeNull();

    await fireEvent.press(screen.getByTestId('cal-2026-12-04'));
    expect(screen.getByTestId('cal-2026-12-04').props.accessibilityLabel).toContain('Riba dozvoljena');
    const card = within(screen.getByTestId('selected-day-card'));
    expect(card.getByText('Petak, 4. decembar')).toBeTruthy();
    expect(card.getByText('Riba dozvoljena')).toBeTruthy();
    expect(card.getByText(/Vavedenje/)).toBeTruthy();
    expect(card.getByText('po starom 21. novembar')).toBeTruthy();
    expect(screen.getByTestId('btn-cal-today')).toBeTruthy();
  });

  it('marks the slava day', async () => {
    await open('2026-12-02T16:30');
    expect(screen.getByTestId('cal-2026-12-19').props.accessibilityLabel).toContain('slava Sveti Nikola');
  });

  it('month navigation crosses the year and Danas returns', async () => {
    await open('2026-12-02T16:30');
    await fireEvent.press(screen.getByTestId('btn-cal-next'));
    expect(screen.getByText('Januar')).toBeTruthy();
    expect(screen.getByText('2027')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('cal-2027-01-07'));
    expect(within(screen.getByTestId('selected-day-card')).getByText('Mrsno')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-cal-prev'));
    expect(screen.getByText('Decembar')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-cal-prev'));
    await fireEvent.press(screen.getByTestId('btn-cal-today'));
    expect(screen.getByText('Decembar')).toBeTruthy();
    expect(screen.queryByTestId('btn-cal-today')).toBeNull();
  });

  it('15.3.2027: Veliki post starts, voda', async () => {
    await open('2027-03-15T10:00', { strictness: 'voda' });
    expect(screen.getByText('Mart')).toBeTruthy();
    expect(screen.getByTestId('cal-2027-03-15').props.accessibilityLabel).toBe('15. mart, Post na vodi, danas');
    expect(screen.getByTestId('cal-2027-03-12').props.accessibilityLabel).not.toContain('Post na vodi');
    expect(within(screen.getByTestId('selected-day-card')).getByText('Post na vodi')).toBeTruthy();
  });

  it('without practices every day is free and no legend shows', async () => {
    await open('2026-12-02T16:30', { orthodox: false, slavaId: null });
    expect(screen.queryByTestId('kal-legend')).toBeNull();
    expect(screen.queryByText(/po starom/)).toBeNull();
  });

  it('report button pushes the sheet with the selected date', async () => {
    await open('2026-12-02T16:30');
    await fireEvent.press(screen.getByTestId('cal-2026-12-04'));
    await fireEvent.press(screen.getByTestId('btn-report-selected'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(sheets)/prijava-greske',
      params: { date: '2026-12-04', context: 'kalendar' },
    });
  });
});
