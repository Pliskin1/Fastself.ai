import { toDayNum } from '@fastself/core';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderUI } from '@/components/test-utils';
import DanasScreen from '@/app/(tabs)/danas';
import IzuzetakSheet from '@/app/(sheets)/izuzetak';
import { getSettings } from '@/store/settings';
import { at, fixtureSettings, withProviders } from '@/test/utils';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const DEC_2 = toDayNum(2026, 12, 2);
const NOW = at('2026-12-02T16:30');

describe('Danas', () => {
  it('2.12.2026 16:30, orthodox + IF 16:8 with mjera ulje', async () => {
    await render(
      withProviders(<DanasScreen />, {
        settings: fixtureSettings({ orthodox: true, ifOn: true, ifPlan: 16, strictness: 'ulje' }),
        now: at('2026-12-02T16:30'),
      }),
    );
    expect(screen.getByText('Srijeda, 2. decembar')).toBeTruthy();
    expect(screen.getByText('Post na ulju')).toBeTruthy();
    expect(screen.getByText('Prozor za jelo još')).toBeTruthy();
    expect(screen.getByText('prozor od 12:00 do 20:00')).toBeTruthy();
    expect(screen.getByText('Pravoslavni post')).toBeTruthy();
    expect(screen.getByText('Isprekidani post 16:8')).toBeTruthy();
  });

  it('4.12.2026, orthodox only: riba day shows the word instead of a countdown', async () => {
    await render(
      withProviders(<DanasScreen />, {
        settings: fixtureSettings({ orthodox: true }),
        now: at('2026-12-04T16:30'),
      }),
    );
    expect(screen.getByText('Riba dozvoljena')).toBeTruthy();
    expect(within(screen.getByTestId('day-dial')).getByText('riba')).toBeTruthy();
    expect(screen.queryByText('Prozor za jelo još')).toBeNull();
  });

  it('8.2.2027 16:30, Ramadan day 1: counts down to iftar', async () => {
    await render(
      withProviders(<DanasScreen />, {
        settings: fixtureSettings({ ramadan: true }),
        now: at('2027-02-08T16:30'),
      }),
    );
    expect(screen.getByText('1. ramazan')).toBeTruthy();
    expect(screen.getByText('Do iftara')).toBeTruthy();
    expect(screen.getByText('iftar u 17:06')).toBeTruthy();
    expect(within(screen.getByTestId('btn-edit-practices')).getByText('Ramazan')).toBeTruthy();
    expect(screen.getByRole('timer').props.accessibilityLabel).toBe('Do iftara 0 sati i 36 minuta. iftar u 17:06.');
  });

  it('lists what is allowed and what is not, marking allergies', async () => {
    await render(
      withProviders(<DanasScreen />, {
        settings: fixtureSettings({ orthodox: true, allergies: ['orasasto'] }),
        now: NOW,
      }),
    );
    expect(screen.getByText('povrće')).toBeTruthy();
    expect(screen.getByText('meso')).toBeTruthy();
    expect(screen.getByText('orašaste plodove (alergija)')).toBeTruthy();
  });

  it('shows the receipt and sends a report with the date and context', async () => {
    await render(withProviders(<DanasScreen />, { settings: fixtureSettings({ orthodox: true }), now: NOW }));
    expect(screen.queryByTestId('why-receipt')).toBeNull();
    await fireEvent.press(screen.getByTestId('btn-why'));
    expect(screen.getByTestId('why-receipt')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-report-day'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(sheets)/prijava-greske',
      params: { date: '2026-12-02', context: 'danas' },
    });
    await fireEvent.press(screen.getByTestId('btn-cant-fast'));
    expect(router.push).toHaveBeenCalledWith('/(sheets)/izuzetak');
  });

  it('records an exception from the sheet and undoes it on Danas', async () => {
    await render(withProviders(<IzuzetakSheet />, { settings: fixtureSettings({ orthodox: true }), now: NOW }));
    expect(screen.getByTestId('btn-confirm-exception').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('chip-reason-zdravlje'));
    await fireEvent.press(screen.getByTestId('btn-confirm-exception'));
    expect(getSettings().exceptions[DEC_2]).toBe('zdravlje');
    expect(router.back).toHaveBeenCalled();

    await renderUI(<DanasScreen />);
    expect(screen.getByText('Danas ne postiš')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-undo-exception'));
    expect(getSettings().exceptions[DEC_2]).toBeUndefined();
  });

  it('Ramadan day 1 shows the month card and the vaktija cells', async () => {
    await render(
      withProviders(<DanasScreen />, { settings: fixtureSettings({ ramadan: true }), now: at('2027-02-08T16:30') }),
    );
    expect(screen.getByText('1. od 30 dana')).toBeTruthy();
    expect(screen.getByText('Nema dana za naknadu')).toBeTruthy();
    expect(screen.getByText('Vaktija, Podgorica')).toBeTruthy();
    expect(screen.getByText('05:14')).toBeTruthy();
    expect(screen.getByText('17:06')).toBeTruthy();
    expect(screen.getByText('Podsjetnik za sehur u 04:44')).toBeTruthy();
  });

  it('counts the days to Ramadan before it starts', async () => {
    await render(withProviders(<DanasScreen />, { settings: fixtureSettings({ ramadan: true }), now: NOW }));
    expect(screen.getByText('68')).toBeTruthy();
    expect(screen.getByText('dana do Ramazana')).toBeTruthy();
  });

  it('toggles a suggested nafila fast', async () => {
    await render(
      withProviders(<DanasScreen />, { settings: fixtureSettings({ nafila: true }), now: at('2026-11-30T10:00') }),
    );
    await fireEvent.press(screen.getByTestId('btn-nafila-on'));
    expect(getSettings().nafilaDays[toDayNum(2026, 11, 30)]).toBe(true);
    expect(screen.getByTestId('btn-nafila-off')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-nafila-off'));
    expect(getSettings().nafilaDays[toDayNum(2026, 11, 30)]).toBeUndefined();
  });

  it('shows the slava within 60 days and a week of seven days', async () => {
    await render(
      withProviders(<DanasScreen />, {
        settings: fixtureSettings({ orthodox: true, slavaId: 'nikola' }),
        now: NOW,
      }),
    );
    expect(screen.getByText('Sveti Nikola')).toBeTruthy();
    expect(screen.getByText('Tvoja slava, za 17 dana')).toBeTruthy();
    expect(screen.getAllByLabelText(/^(Sri|Čet|Pet|Sub|Ned|Pon|Uto), /)).toHaveLength(7);
  });
});
