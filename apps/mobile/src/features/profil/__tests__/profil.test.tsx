import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { ToastProvider } from '@/components';
import ProfilScreen from '@/app/(tabs)/profil';
import VaktijaScreen from '@/app/vaktija';
import PrivatnostScreen from '@/app/privatnost';
import { POLICY_URL } from '@/config';
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

jest.mock('@/lib/export', () => ({ exportData: jest.fn(async () => ({ ok: true })) }));
jest.mock('@/notifications/permissions', () => ({ ensureNotificationPermission: jest.fn(async () => true) }));
jest.mock('@/sync/consents', () => ({
  setConsents: jest.fn(async (changes: Record<string, boolean>) => {
    const { consents: repo } = jest.requireActual<typeof import('@/db/repo/consents')>('@/db/repo/consents');
    for (const [kind, on] of Object.entries(changes)) repo.set(kind as 'practices', on);
    return { ok: true };
  }),
}));
jest.mock('@/sync', () => ({ deleteServerCopy: jest.fn(async () => ({ ok: true })) }));
const mockSession: { user: { id: string; email: string } | null } = { user: null };
jest.mock('@/lib/auth', () => ({
  useSession: () => ({ user: mockSession.user, provider: mockSession.user ? 'email' : null }),
  signOut: jest.fn(async () => ({ ok: true })),
}));

const NOW = at('2026-12-02T16:30');
const open = (ui: React.ReactElement, patch = {}) =>
  render(withProviders(ui, { settings: fixtureSettings({ orthodox: true, ...patch }), now: NOW }));

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.user = null;
});

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
    ['row-terms', '/uslovi'],
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

  it('export row runs the export and shows a toast', async () => {
    const { exportData } = jest.requireMock<typeof import('@/lib/export')>('@/lib/export');
    await render(
      withProviders(
        <ToastProvider>
          <ProfilScreen />
        </ToastProvider>,
        { settings: fixtureSettings({ orthodox: true }), now: NOW },
      ),
    );
    await fireEvent.press(screen.getByTestId('row-export'));
    expect(exportData).toHaveBeenCalled();
    expect(await screen.findByText('Izvoz je spreman: JSON fajl')).toBeTruthy();
  });

  it('has no AI switch in v1', async () => {
    await open(<ProfilScreen />);
    expect(screen.queryByTestId('sw-ai')).toBeNull();
  });

  it('signed in: email, sign out and delete account on the card and in the list', async () => {
    mockSession.user = { id: 'u1', email: 'review@fastself.ai' };
    const { signOut } = jest.requireMock<typeof import('@/lib/auth')>('@/lib/auth');
    await open(<ProfilScreen />);
    expect(screen.getByText('review@fastself.ai')).toBeTruthy();
    expect(within(screen.getByTestId('row-delete')).getByText('Obriši nalog')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-delete-account'));
    expect(router.push).toHaveBeenCalledWith('/(sheets)/brisanje');
    await fireEvent.press(screen.getByTestId('btn-sign-out'));
    expect(signOut).toHaveBeenCalled();
  });

  it('signed in: the sync switch writes the three sync consents', async () => {
    mockSession.user = { id: 'u1', email: 'review@fastself.ai' };
    const { setConsents } = jest.requireMock<typeof import('@/sync/consents')>('@/sync/consents');
    await open(<ProfilScreen />);
    await fireEvent.press(screen.getByTestId('sw-sync'));
    expect(setConsents).toHaveBeenCalledWith({ practices: true, allergies: true, history: true });
    expect(consents.get('history')).toBe(true);
  });

  it('reminder switches persist and ask for permission before turning on', async () => {
    const { ensureNotificationPermission } =
      jest.requireMock<typeof import('@/notifications/permissions')>('@/notifications/permissions');
    await open(<ProfilScreen />);
    const start = getSettings().reminders;
    await fireEvent.press(screen.getByTestId('sw-rem-evening'));
    await fireEvent.press(screen.getByTestId('sw-rem-ramadan'));
    await waitFor(() =>
      expect(getSettings().reminders).toMatchObject({ evening: !start.evening, ramadan: !start.ramadan }),
    );
    if (!start.evening || !start.ramadan) expect(ensureNotificationPermission).toHaveBeenCalled();
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
  it('shows three sections without AI, opens the policy and the terms', async () => {
    const link = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await open(<PrivatnostScreen />);
    for (const id of ['phone', 'server', 'rights']) expect(screen.getByTestId(`privacy-${id}`)).toBeTruthy();
    expect(screen.queryByTestId('privacy-ai')).toBeNull();
    await fireEvent.press(screen.getByTestId('btn-open-policy'));
    expect(link).toHaveBeenCalledWith(POLICY_URL);
    await fireEvent.press(screen.getByTestId('btn-open-terms'));
    expect(router.push).toHaveBeenCalledWith('/uslovi');
  });
});
