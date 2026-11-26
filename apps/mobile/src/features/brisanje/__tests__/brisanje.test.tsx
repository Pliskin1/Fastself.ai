import type { User } from '@supabase/supabase-js';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import BrisanjeScreen from '@/app/(sheets)/brisanje';
import { deleteAccountAndSignOut, wipeDevice, type DeleteAccountResult } from '@/lib/account';
import type { Session } from '@/lib/auth';
import { withProviders } from '@/test/utils';

// The real ToastProvider keeps a 2.6 s timer alive after the run, so the toast is a spy here.
const mockShow = jest.fn();
jest.mock('@/components', () => ({
  ...jest.requireActual('@/components'),
  useToast: () => ({ show: (message: string) => mockShow(message) }),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), dismissAll: jest.fn(), canDismiss: jest.fn(() => true) },
}));
jest.mock('@/lib/account', () => ({ wipeDevice: jest.fn(), deleteAccountAndSignOut: jest.fn() }));
const mockSession: { current: Session } = { current: { user: null, provider: null } };
jest.mock('@/lib/auth', () => ({ useSession: () => mockSession.current }));

const wipe = jest.mocked(wipeDevice);
const removeAccount = jest.mocked(deleteAccountAndSignOut);
const back = jest.mocked(router.back);
const replace = jest.mocked(router.replace);
const dismissAll = jest.mocked(router.dismissAll);

const GUEST: Session = { user: null, provider: null };
const signedIn = (provider: 'apple' | 'email'): Session => ({ user: { id: 'u1' } as User, provider });

const TEXT = {
  titleAccount: 'Obrisati nalog?',
  titleLocal: 'Obrisati podatke sa telefona?',
  bodyAccount:
    'Brišemo nalog i sve podatke sa servera: prakse, alergije, istoriju, jelovnike i pristanke. Ovo se ne može vratiti.',
  bodyLocal: 'Brišemo prakse, alergije, istoriju i podešavanja sa ovog telefona. Ovo se ne može vratiti.',
  apple: 'Ako si se prijavio uz Apple, opozivamo i tu prijavu.',
  confirmAccount: 'Obriši nalog',
  confirmLocal: 'Obriši podatke',
  done: 'Nalog i podaci na serveru su obrisani',
  alsoLocal: 'Obrisati i podatke sa ovog telefona?',
  keepLocal: 'Zadrži podatke na telefonu',
  error: 'Veza nije uspjela. Provjeri internet i pokušaj ponovo.',
};

const renderSheet = (session: Session = GUEST) => {
  mockSession.current = session;
  return render(withProviders(<BrisanjeScreen />));
};
const confirmButton = () => screen.getByTestId('btn-confirm-delete');
const isDisabled = (testID: string) => screen.getByTestId(testID).props.accessibilityState.disabled === true;

/** A call that stays in flight until the test resolves it. */
function held<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** The account delete as the real one ends: the session is gone by the time it resolves. */
const deleteSignsOut = (result: DeleteAccountResult) => async () => {
  if (result.ok) mockSession.current = GUEST;
  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
  wipe.mockResolvedValue(undefined);
  removeAccount.mockImplementation(deleteSignsOut({ ok: true }));
});

describe('brisanje sheet', () => {
  it('shows the local texts to a guest; confirm wipes once and starts again from the root', async () => {
    await renderSheet();
    expect(screen.getByTestId('screen-brisanje')).toBeTruthy();
    expect(screen.getByText(TEXT.titleLocal)).toBeTruthy();
    expect(screen.getByText(TEXT.bodyLocal)).toBeTruthy();
    expect(confirmButton().props.accessibilityLabel).toBe(TEXT.confirmLocal);
    expect(confirmButton().props.accessibilityRole).toBe('button');
    expect(screen.queryByText(TEXT.titleAccount)).toBeNull();
    expect(screen.queryByText(TEXT.apple)).toBeNull();

    await fireEvent.press(confirmButton());

    expect(wipe).toHaveBeenCalledTimes(1);
    expect(removeAccount).not.toHaveBeenCalled();
    expect(dismissAll).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/');
    expect(dismissAll.mock.invocationCallOrder[0]).toBeLessThan(replace.mock.invocationCallOrder[0] ?? 0);
    expect(back).not.toHaveBeenCalled();
  });

  it('shows the account texts when signed in, and the Apple note only for an Apple account', async () => {
    const view = await renderSheet(signedIn('email'));
    expect(screen.getByText(TEXT.titleAccount)).toBeTruthy();
    expect(screen.getByText(TEXT.bodyAccount)).toBeTruthy();
    expect(confirmButton().props.accessibilityLabel).toBe(TEXT.confirmAccount);
    expect(screen.queryByText(TEXT.apple)).toBeNull();
    expect(screen.queryByText(TEXT.titleLocal)).toBeNull();
    await view.unmount();

    await renderSheet(signedIn('apple'));
    expect(screen.getByText(TEXT.titleAccount)).toBeTruthy();
    expect(screen.getByText(TEXT.apple)).toBeTruthy();
  });

  it('deletes the account, shows the toast and then asks about the phone although no one is signed in', async () => {
    await renderSheet(signedIn('apple'));
    await fireEvent.press(confirmButton());

    expect(removeAccount).toHaveBeenCalledTimes(1);
    expect(wipe).not.toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith(TEXT.done);
    expect(mockSession.current.user).toBeNull();
    expect(screen.getByText(TEXT.alsoLocal)).toBeTruthy();
    expect(screen.getByText(TEXT.bodyLocal)).toBeTruthy();
    expect(screen.queryByText(TEXT.titleLocal)).toBeNull();
    expect(screen.queryByText(TEXT.apple)).toBeNull();
    expect(confirmButton().props.accessibilityLabel).toBe(TEXT.confirmLocal);
    expect(screen.getByTestId('btn-keep-local').props.accessibilityLabel).toBe(TEXT.keepLocal);
    expect(back).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('second step: "Obriši podatke" wipes the phone and starts again from the root', async () => {
    await renderSheet(signedIn('email'));
    await fireEvent.press(confirmButton());
    await fireEvent.press(confirmButton());

    expect(removeAccount).toHaveBeenCalledTimes(1);
    expect(wipe).toHaveBeenCalledTimes(1);
    expect(dismissAll).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('second step: "Zadrži podatke na telefonu" closes the sheet and wipes nothing', async () => {
    await renderSheet(signedIn('email'));
    await fireEvent.press(confirmButton());
    await fireEvent.press(screen.getByTestId('btn-keep-local'));

    expect(back).toHaveBeenCalledTimes(1);
    expect(wipe).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows the alert after a failed delete, wipes nothing, and a second press retries', async () => {
    removeAccount.mockImplementationOnce(deleteSignsOut({ ok: false, error: 'offline' }));
    await renderSheet(signedIn('email'));
    await fireEvent.press(confirmButton());

    const alert = screen.getByTestId('delete-error');
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(alert.props.accessibilityLiveRegion).toBe('assertive');
    expect(screen.getByText(TEXT.error)).toBeTruthy();
    expect(screen.getByText(TEXT.titleAccount)).toBeTruthy();
    expect(mockShow).not.toHaveBeenCalled();
    expect(wipe).not.toHaveBeenCalled();
    expect(isDisabled('btn-confirm-delete')).toBe(false);

    await fireEvent.press(confirmButton());
    expect(removeAccount).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(TEXT.error)).toBeNull();
    expect(screen.getByText(TEXT.alsoLocal)).toBeTruthy();
  });

  it('shows the alert when the wipe throws, and lets the user try again', async () => {
    wipe.mockRejectedValueOnce(new Error('disk'));
    await renderSheet();
    await fireEvent.press(confirmButton());

    expect(screen.getByText(TEXT.error)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    expect(isDisabled('btn-confirm-delete')).toBe(false);

    await fireEvent.press(confirmButton());
    expect(wipe).toHaveBeenCalledTimes(2);
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('disables both buttons while a call is pending and makes one call for a double press', async () => {
    const call = held<DeleteAccountResult>();
    removeAccount.mockReturnValueOnce(call.promise);
    await renderSheet(signedIn('email'));
    await fireEvent.press(confirmButton());
    await fireEvent.press(confirmButton());

    expect(removeAccount).toHaveBeenCalledTimes(1);
    expect(isDisabled('btn-confirm-delete')).toBe(true);
    expect(isDisabled('btn-cancel-delete')).toBe(true);
    // The sign-out lands before the call returns: the account texts stay until the second step.
    mockSession.current = GUEST;
    await screen.rerender(withProviders(<BrisanjeScreen />));
    expect(screen.getByText(TEXT.titleAccount)).toBeTruthy();
    expect(screen.queryByText(TEXT.titleLocal)).toBeNull();

    await act(async () => call.resolve({ ok: true }));
    expect(screen.getByText(TEXT.alsoLocal)).toBeTruthy();
    expect(isDisabled('btn-confirm-delete')).toBe(false);
    expect(isDisabled('btn-keep-local')).toBe(false);
  });

  it('does not navigate for another screen when the sheet was swiped away during the delete', async () => {
    const call = held<DeleteAccountResult>();
    removeAccount.mockReturnValueOnce(call.promise);
    const view = await renderSheet(signedIn('email'));
    await fireEvent.press(confirmButton());
    await view.unmount();
    await act(async () => call.resolve({ ok: true }));

    expect(mockShow).toHaveBeenCalledWith(TEXT.done);
    expect(back).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(dismissAll).not.toHaveBeenCalled();
    expect(wipe).not.toHaveBeenCalled();
  });

  it('cancel closes the sheet without deleting anything', async () => {
    await renderSheet(signedIn('email'));
    await fireEvent.press(screen.getByTestId('btn-cancel-delete'));
    expect(back).toHaveBeenCalledTimes(1);
    expect(removeAccount).not.toHaveBeenCalled();
    expect(wipe).not.toHaveBeenCalled();
  });
});
