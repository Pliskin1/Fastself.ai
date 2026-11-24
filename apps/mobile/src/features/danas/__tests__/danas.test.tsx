import { render, screen } from '@testing-library/react-native';
import DanasScreen from '@/app/(tabs)/danas';
import { at, fixtureSettings, withProviders } from '@/test/utils';

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
    expect(screen.getByText('riba')).toBeTruthy();
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
    expect(screen.getByText('Ramazan')).toBeTruthy();
    expect(screen.getByRole('timer').props.accessibilityLabel).toBe('Do iftara 0 sati i 36 minuta. iftar u 17:06.');
  });
});
