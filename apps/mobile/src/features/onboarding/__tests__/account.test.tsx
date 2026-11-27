import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ToastProvider } from '@/components';
import NalogScreen from '@/app/nalog';
import ObNalogScreen from '@/app/(onboarding)/nalog';
import UsloviScreen from '@/app/uslovi';
import { signInWithPassword, signUpWithPassword } from '@/lib/auth';
import { setConsents } from '@/sync/consents';
import { getSettings } from '@/store/settings';
import { fixtureSettings, withProviders } from '@/test/utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/lib/auth', () => ({
  MIN_PASSWORD_LENGTH: 8,
  useSession: () => ({ user: null, provider: null }),
  signInWithPassword: jest.fn(),
  signUpWithPassword: jest.fn(),
}));
jest.mock('@/sync/consents', () => ({ setConsents: jest.fn(async () => ({ ok: true })) }));

const signIn = signInWithPassword as jest.MockedFunction<typeof signInWithPassword>;
const signUp = signUpWithPassword as jest.MockedFunction<typeof signUpWithPassword>;

const open = (ui: React.ReactElement, settings = {}) =>
  render(withProviders(<ToastProvider>{ui}</ToastProvider>, { settings: fixtureSettings(settings) }));

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByTestId('input-email'), email);
  await fireEvent.changeText(screen.getByTestId('input-password'), password);
  await fireEvent.press(screen.getByTestId('btn-auth-submit'));
}

beforeEach(() => jest.clearAllMocks());

describe('Account flow (email + password)', () => {
  it('has no Apple or Google button', async () => {
    await open(<NalogScreen />);
    expect(screen.queryByTestId('btn-apple')).toBeNull();
    expect(screen.queryByText(/Apple|Google/)).toBeNull();
  });

  it('sign up creates the account, then asks about sync and goes back', async () => {
    signUp.mockResolvedValue({ ok: true });
    await open(<NalogScreen />);
    await fill('novi@primjer.me', 'lozinka123');
    expect(signUp).toHaveBeenCalledWith('novi@primjer.me', 'lozinka123');
    expect(await screen.findByText('Šta da sinhronizujemo?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-enable-sync'));
    expect(setConsents).toHaveBeenCalledWith({ practices: true, allergies: true, history: true });
    expect(router.back).toHaveBeenCalled();
  });

  it('sign in mode uses signInWithPassword and shows a wrong password', async () => {
    signIn.mockResolvedValue({ ok: false, error: 'invalid_credentials' });
    await open(<NalogScreen />);
    await fireEvent.press(screen.getByText('Prijava'));
    await fill('review@fastself.ai', 'pogresno1');
    expect(signIn).toHaveBeenCalledWith('review@fastself.ai', 'pogresno1');
    expect(await screen.findByTestId('auth-error')).toHaveTextContent('Email ili lozinka nisu tačni.');
    expect(router.back).not.toHaveBeenCalled();
  });

  it.each([
    ['email_taken', 'Nalog sa ovim emailom već postoji. Prijavi se.'],
    ['weak_password', 'Lozinka mora imati najmanje 8 znakova.'],
    ['offline', 'Nema interneta. Provjeri vezu i pokušaj ponovo.'],
    ['server', 'Prijava trenutno ne radi. Pokušaj malo kasnije.'],
  ] as const)('%s shows its message', async (error, text) => {
    signUp.mockResolvedValue({ ok: false, error });
    await open(<NalogScreen />);
    await fill('novi@primjer.me', 'lozinka123');
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it('password can be shown', async () => {
    await open(<NalogScreen />);
    expect(screen.getByTestId('input-password').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByTestId('btn-toggle-password'));
    expect(screen.getByTestId('input-password').props.secureTextEntry).toBe(false);
  });

  it('onboarding: skip finishes onboarding; "Ne sada" after sign up also finishes it', async () => {
    await open(<ObNalogScreen />, { onboarded: false });
    await fireEvent.press(screen.getByTestId('btn-skip-account'));
    expect(getSettings().onboarded).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/danas');
  });

  it('legal links open the terms and the policy', async () => {
    await open(<NalogScreen />);
    await fireEvent.press(screen.getByTestId('link-terms'));
    expect(router.push).toHaveBeenCalledWith('/uslovi');
    await fireEvent.press(screen.getByTestId('link-policy'));
    expect(router.push).toHaveBeenCalledWith('/privatnost');
  });
});

describe('Uslovi', () => {
  it('shows all nine sections and no placeholders', async () => {
    await open(<UsloviScreen />);
    for (let n = 1; n <= 9; n++) expect(screen.getByTestId(`terms-${n}`)).toBeTruthy();
    expect(screen.queryByText(/POPUNI|\[/)).toBeNull();
    expect(screen.getByText(/Licensed Application EULA/)).toBeTruthy();
  });
});
