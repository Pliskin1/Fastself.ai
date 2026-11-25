import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { ToastProvider } from '@/components';
import ProfilScreen from '@/app/(tabs)/profil';
import VaktijaScreen from '@/app/vaktija';
import PrivatnostScreen from '@/app/privatnost';
import { consents } from '@/db/repo/consents';
import { getSettings } from '@/store/settings';
import { at, fixtureSettings, withProviders } from '@/test/utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(cb, [cb]);
  },
}));

const NOW = at('2026-12-02T16:30');
const open = (ui: React.ReactElement, patch = {}) =>
  render(withProviders(ui, { settings: fixtureSettings({ orthodox: true, ...patch }), now: NOW }));

beforeEach(() => jest.clearAllMocks());

describe('Profil', () => {
  it('logged out card, practice summary and footer', async () => {
    await open(<ProfilScreen />, { ifOn: true, ifPlan: 16, allergies: ['gluten', 'kikiriki'] });
    expect(screen.getByText('Podaci su samo na ovom telefonu')).toBeTruthy();
    expect(
      within(screen.getByTestId('row-practices')).getByText(/Pravoslavni post, Isprekidani post 16:8/),
    ).toBeTruthy();
    expect(within(screen.getByTestId('row-allergies')).getByText('2 namirnice')).toBeTruthy();
    expect(screen.getByText(/Aplikacija ne daje medicinske savjete/)).toBeTruthy();
  });

  it.each([
    ['btn-open-account', '/nalog'],
    ['row-practices', '/prakse'],
    ['row-allergies', '/alergije'],
    ['row-vaktija', '/vaktija'],
    ['row-privacy', '/privatnost'],
    ['row-delete', '/(sheets)/brisanje'],
  ])('%s opens %s', async (id, href) => {
    await open(<ProfilScreen />);
    await fireEvent.press(screen.getByTestId(id));
    expect(router.push).toHaveBeenCalledWith(href);
  });

  it('report row opens the report sheet', async () => {
    await open(<ProfilScreen />);
    await fireEvent.press(screen.getByTestId('row-report'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/(sheets)/prijava-greske', params: { context: 'profil' } });
  });

  it('export row is disabled and does nothing', async () => {
    await open(<ProfilScreen />);
    expect(screen.getByTestId('row-export').props.accessibilityState).toEqual({ disabled: true });
    await fireEvent.press(screen.getByTestId('row-export'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('reminder switches persist', async () => {
    await open(<ProfilScreen />);
    const start = getSettings().reminders;
    await fireEvent.press(screen.getByTestId('sw-rem-evening'));
    expect(getSettings().reminders.evening).toBe(!start.evening);
    await fireEvent.press(screen.getByTestId('sw-rem-ramadan'));
    expect(getSettings().reminders).toMatchObject({ evening: !start.evening, ramadan: !start.ramadan });
  });

  it('AI on opens the consent sheet and does not set the consent itself', async () => {
    await open(<ProfilScreen />);
    await fireEvent.press(screen.getByTestId('sw-ai'));
    expect(router.push).toHaveBeenCalledWith('/(sheets)/ai-pristanak');
    expect(consents.get('ai')).toBe(false);
  });

  it('AI off is immediate with a toast', async () => {
    const ui = withProviders(
      <ToastProvider>
        <ProfilScreen />
      </ToastProvider>,
      { settings: fixtureSettings({ orthodox: true }), now: NOW },
    );
    consents.set('ai', true);
    await render(ui);
    await fireEvent.press(screen.getByTestId('sw-ai'));
    expect(consents.get('ai')).toBe(false);
    expect(screen.getByText('AI prijedlozi su isključeni')).toBeTruthy();
  });

  it('sync switch sends a logged out user to the account flow', async () => {
    await open(<ProfilScreen />);
    await fireEvent.press(screen.getByTestId('sw-sync'));
    expect(router.push).toHaveBeenCalledWith('/nalog');
  });
});

describe('Vaktija', () => {
  it('shows zora and akšam and changes city and method', async () => {
    await open(<VaktijaScreen />, { ramadan: true, prayerMethod: 'mwl' });
    expect(within(screen.getByTestId('city-card')).getByText('Podgorica')).toBeTruthy();
    expect(screen.getByTestId('time-fajr').props.children).toMatch(/^\d\d:\d\d$/);
    const before = screen.getByTestId('time-maghrib').props.children;

    await fireEvent.press(screen.getByTestId('btn-change-city'));
    await fireEvent.press(screen.getByTestId('chip-city-bar'));
    expect(getSettings().city).toBe('bar');
    await fireEvent.press(screen.getByTestId('radio-method-turkey'));
    expect(getSettings().prayerMethod).toBe('turkey');
    expect(before).toMatch(/^\d\d:\d\d$/);
  });

  it('offsets persist, move the shown time and stop at the limit', async () => {
    await open(<VaktijaScreen />);
    const base = screen.getByTestId('time-fajr').props.children as string;
    await fireEvent.press(screen.getByTestId('btn-fajr-plus'));
    await fireEvent.press(screen.getByTestId('btn-fajr-plus'));
    expect(getSettings().offsets.fajr).toBe(2);
    expect(screen.getByTestId('val-fajr').props.children.join('')).toBe('+2 min');
    expect(screen.getByTestId('time-fajr').props.children).not.toBe(base);
    await fireEvent.press(screen.getByTestId('btn-maghrib-minus'));
    expect(getSettings().offsets.maghrib).toBe(-1);
  });

  it('Ramadan shift is limited to one day', async () => {
    await open(<VaktijaScreen />);
    await fireEvent.press(screen.getByTestId('btn-shift-plus'));
    await fireEvent.press(screen.getByTestId('btn-shift-plus'));
    expect(getSettings().ramadanShift).toBe(1);
    await fireEvent.press(screen.getByTestId('btn-shift-minus'));
    await fireEvent.press(screen.getByTestId('btn-shift-minus'));
    await fireEvent.press(screen.getByTestId('btn-shift-minus'));
    expect(getSettings().ramadanShift).toBe(-1);
  });

  it('back button returns', async () => {
    await open(<VaktijaScreen />);
    await fireEvent.press(screen.getByTestId('btn-back'));
    expect(router.back).toHaveBeenCalled();
  });
});

describe('Privatnost', () => {
  it('shows four sections, names the provider and opens the policy', async () => {
    const link = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await open(<PrivatnostScreen />);
    for (const id of ['phone', 'server', 'ai', 'rights']) expect(screen.getByTestId(`privacy-${id}`)).toBeTruthy();
    expect(screen.getByText(/Servis: Anthropic \(Claude\)/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-open-policy'));
    expect(link).toHaveBeenCalledWith('https://fastself.ai/privacy');
  });
});
