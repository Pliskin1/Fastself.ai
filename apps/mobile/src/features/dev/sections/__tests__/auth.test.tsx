import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AuthSection from '@/features/dev/sections/auth';
import { sendEmailCode, signOut, useSession, verifyEmailCode } from '@/lib/auth';
import { useSyncStatus } from '@/sync';
import { setConsents } from '@/sync/consents';
import { withProviders } from '@/test/utils';

// The real ToastProvider keeps a 2.6 s timer alive after the run, so the toast is a spy here.
const mockShow = jest.fn();
jest.mock('@/components', () => ({
  ...jest.requireActual('@/components'),
  useToast: () => ({ show: (message: string) => mockShow(message) }),
}));
jest.mock('@/lib/auth', () => ({
  sendEmailCode: jest.fn(),
  verifyEmailCode: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(),
}));
jest.mock('@/sync', () => ({ useSyncStatus: jest.fn() }));
jest.mock('@/sync/consents', () => ({ setConsents: jest.fn() }));

const send = jest.mocked(sendEmailCode);
const verify = jest.mocked(verifyEmailCode);
const logout = jest.mocked(signOut);
const session = jest.mocked(useSession);
const status = jest.mocked(useSyncStatus);
const consent = jest.mocked(setConsents);

const USER = { id: 'u1', email: 'proba@primjer.me' } as NonNullable<ReturnType<typeof useSession>['user']>;

const renderSection = () => render(withProviders(<AuthSection />));
const press = (testID: string) => act(async () => fireEvent.press(screen.getByTestId(testID)));
const type = (testID: string, text: string) => act(async () => fireEvent.changeText(screen.getByTestId(testID), text));

beforeEach(() => {
  // clearAllMocks, not resetAllMocks: a reset would also wipe the React Native mocks of jest.setup.js.
  jest.clearAllMocks();
  session.mockReturnValue({ user: null, provider: null });
  status.mockReturnValue('off');
});

describe('dev screen: auth section', () => {
  it('shows a guest with sync off and the email form', async () => {
    await renderSection();
    expect(screen.getByTestId('dev-auth-session')).toHaveTextContent('- · off');
    expect(screen.getByTestId('dev-auth-input-email')).toBeTruthy();
    expect(screen.queryByTestId('dev-auth-logout')).toBeNull();
    expect(screen.queryByTestId('dev-auth-result')).toBeNull();
  });

  it('"send code" sends the typed email and shows the result', async () => {
    send.mockResolvedValue({ ok: true });
    await renderSection();
    await type('dev-auth-input-email', 'proba@primjer.me');
    await press('dev-auth-send');

    expect(send).toHaveBeenCalledWith('proba@primjer.me');
    expect(screen.getByTestId('dev-auth-result')).toHaveTextContent('Pošalji kod: ok');
  });

  it('"verify" checks the typed code and shows the error code as it came back', async () => {
    verify.mockResolvedValue({ ok: false, error: 'invalid_code' });
    await renderSection();
    await type('dev-auth-input-email', 'proba@primjer.me');
    await type('dev-auth-input-code', '123456');
    await press('dev-auth-verify');

    expect(verify).toHaveBeenCalledWith('proba@primjer.me', '123456');
    expect(screen.getByTestId('dev-auth-result')).toHaveTextContent('Potvrdi: invalid_code');
    expect(screen.getByTestId('dev-auth-input-code').props.value).toBe('123456');
  });

  it('clears the code after a successful verify', async () => {
    verify.mockResolvedValue({ ok: true });
    await renderSection();
    await type('dev-auth-input-code', '123456');
    await press('dev-auth-verify');
    expect(screen.getByTestId('dev-auth-input-code').props.value).toBe('');
  });

  it('shows the signed-in user, the provider and the sync status instead of the form', async () => {
    session.mockReturnValue({ user: USER, provider: 'email' });
    status.mockReturnValue('idle');
    await renderSection();

    expect(screen.getByTestId('dev-auth-session')).toHaveTextContent('email · idle');
    expect(screen.getByTestId('dev-auth-email')).toHaveTextContent('proba@primjer.me');
    expect(screen.queryByTestId('dev-auth-input-email')).toBeNull();
  });

  it('"enable sync" turns the three sync consents on and shows the result', async () => {
    session.mockReturnValue({ user: USER, provider: 'email' });
    consent.mockResolvedValue({ ok: false, error: 'offline' });
    await renderSection();
    await press('dev-auth-consent');

    expect(consent).toHaveBeenCalledWith({ practices: true, allergies: true, history: true });
    expect(screen.getByTestId('dev-auth-result')).toHaveTextContent('Uključi sinhronizaciju: offline');
  });

  it('"log out" signs out and says the data stays on the phone', async () => {
    session.mockReturnValue({ user: USER, provider: 'email' });
    logout.mockResolvedValue({ ok: true });
    await renderSection();
    await press('dev-auth-logout');

    expect(logout).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith('Odjavljen si. Podaci ostaju na telefonu.');
  });
});
