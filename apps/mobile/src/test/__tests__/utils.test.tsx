import { DEFAULT_SETTINGS, toDayNum } from '@fastself/core';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { getDb } from '@/db';
import { kvGet } from '@/db/repo/kv';
import { useDayPlan, useNow, useSettings, useToday } from '@/hooks';
import { freezeClock, nowMs } from '@/lib/clock';
import { getSettings } from '@/store/settings';
import { at, fixtureSettings, withProviders } from '@/test/utils';

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: number) =>
    jest.requireActual<typeof import('react')>('react').useRef({ value: initial }).current,
}));

afterEach(() => freezeClock(null));

function Probe() {
  const settings = useSettings();
  const today = useToday();
  const { minute } = useNow();
  const plan = useDayPlan();
  return (
    <>
      <Text>{`strictness ${settings.strictness}`}</Text>
      <Text>{`day ${today} minute ${minute}`}</Text>
      <Text>{plan.title}</Text>
    </>
  );
}

describe('at', () => {
  it('is the epoch of a Podgorica local time', () => {
    expect(at('2026-12-02T16:30')).toBe(Date.UTC(2026, 11, 2, 15, 30));
    expect(at('2026-07-01T16:30')).toBe(Date.UTC(2026, 6, 1, 14, 30));
  });

  it('throws on a typo, so the test fails instead of running at a wrong time', () => {
    expect(() => at('2026-12-02 16:30')).toThrow('YYYY-MM-DDTHH:MM');
    expect(() => at('2026-02-30T10:00')).toThrow();
  });
});

describe('fixtureSettings', () => {
  it('defaults to the conditions of the golden tables: onboarded, Podgorica, MWL, offsets 0, no practices', () => {
    expect(fixtureSettings()).toEqual({ ...DEFAULT_SETTINGS, prayerMethod: 'mwl', onboarded: true });
  });

  it('takes practice flags at the top level and any other setting as it is', () => {
    const settings = fixtureSettings({ orthodox: true, ifOn: true, strictness: 'ulje', city: 'bar', onboarded: false });
    expect(settings.practices).toEqual({ orthodox: true, ramadan: false, nafila: false, ifOn: true });
    expect(settings.strictness).toBe('ulje');
    expect(settings.city).toBe('bar');
    expect(settings.onboarded).toBe(false);
  });

  it('merges a practices object with the flags', () => {
    const settings = fixtureSettings({ practices: { ...DEFAULT_SETTINGS.practices, ramadan: true }, nafila: true });
    expect(settings.practices).toEqual({ orthodox: false, ramadan: true, nafila: true, ifOn: false });
  });

  it('never changes the shared defaults', () => {
    fixtureSettings({ orthodox: true }).practices.ramadan = true;
    expect(DEFAULT_SETTINGS.practices).toEqual({ orthodox: false, ramadan: false, nafila: false, ifOn: false });
  });
});

describe('withProviders', () => {
  it('renders a screen with the given settings and the clock stopped at `now`', async () => {
    await render(
      withProviders(<Probe />, {
        settings: fixtureSettings({ orthodox: true, strictness: 'ulje' }),
        now: at('2026-12-02T16:30'),
      }),
    );
    expect(screen.getByText('strictness ulje')).toBeTruthy();
    expect(screen.getByText(`day ${toDayNum(2026, 12, 2)} minute ${16 * 60 + 30}`)).toBeTruthy();
    expect(screen.getByText('Post na ulju')).toBeTruthy();
    expect(nowMs()).toBe(at('2026-12-02T16:30'));
  });

  it('writes the settings to the test database, like the app does', () => {
    withProviders(<Probe />, { settings: fixtureSettings({ ramadan: true, city: 'plav' }) });
    expect(kvGet(getDb(), 'onboarded')).toBe('1');
    expect(JSON.parse(kvGet(getDb(), 'settings') ?? '{}')).toMatchObject({ city: 'plav' });
    expect(getDb().all("SELECT active FROM practices WHERE practice = 'ramadan'")).toEqual([{ active: 1 }]);
  });

  it('every call starts from a fresh install: nothing leaks from the test before', () => {
    withProviders(<Probe />, { settings: fixtureSettings({ orthodox: true, allergies: ['gluten'] }), now: 5 });
    const firstInstall = kvGet(getDb(), 'install_id');

    withProviders(<Probe />);

    expect(getSettings()).toEqual(fixtureSettings());
    expect(kvGet(getDb(), 'install_id')).not.toBe(firstInstall);
    expect(Math.abs(nowMs() - Date.now())).toBeLessThan(1000); // the clock runs again
  });

  it('accepts plain core settings and treats them as onboarded', () => {
    withProviders(<Probe />, { settings: { ...DEFAULT_SETTINGS, city: 'bar' } });
    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, city: 'bar', onboarded: true });
  });
});
