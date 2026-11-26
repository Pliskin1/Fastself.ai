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
const mockStored = jest.fn<Promise<boolean>, []>();
jest.mock('@/lib/auth', () => ({ useSession: () => mockSession.current, hasStoredSession: () => mockStored() }));

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
  network: 'Veza nije uspjela. Provjeri internet i pokušaj ponovo.',
  failed: 'Brisanje nije uspjelo. Pokušaj ponovo.',
};

/** `stored` is what `hasStoredSession` answers; by default whether `useSession` has a user. */
const renderSheet = (session: Session = GUEST, stored: boolean | Promise<boolean> = session.user !== null) => {
  mockSession.current = session;
  mockStored.mockImplementation(() => (typeof stored === 'boolean' ? Promise.resolve(stored) : stored));
  return render(withProviders(<BrisanjeScreen />));
};
const confirmButton = () => screen.getByTestId('btn-confirm-delete');
const isDisabled = (testID: string) => screen.getByTestId(testID).props.accessibilityState.disabled === true;
// The spinner is hidden from screen readers, and the queries skip hidden elements unless told otherwise.
const spinner = () => screen.queryByTestId('btn-confirm-delete-busy', { includeHiddenElements: true });

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
    expect(screen.queryByTestId('delete-done')).toBeNull();

    await fireEvent.press(confirmButton());

    expect(wipe).toHaveBeenCalledTimes(1);
    expect(removeAccount).not.toHaveBeenCalled();
    expect(dismissAll).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/');
    expect(dismissAll.mock.invocationCallOrder[0]).toBeLessThan(replace.mock.invocationCallOrder[0] ?? 0);
    expect(back).not.toHaveBeenCalled();
  });

  it('keeps confirm disabled until it knows whether a session is stored; cancel works meanwhile', async () => {
    const answer = held<boolean>();
    await renderSheet(GUEST, answer.promise);
    expect(isDisabled('btn-confirm-delete')).toBe(true);
    expect(isDisabled('btn-cancel-delete')).toBe(false);
    await fireEvent.press(confirmButton());
    expect(wipe).not.toHaveBeenCalled();

    await act(async () => answer.resolve(false));
    expect(isDisabled('btn-confirm-delete')).toBe(false);
    expect(screen.getByText(TEXT.titleLocal)).toBeTruthy();
    await fireEvent.press(confirmButton());
    expect(wipe).toHaveBeenCalledTimes(1);
  });

  it('treats a stored session that is not loaded yet as an account: delete, never wipe', async () => {
    await renderSheet(GUEST, true);
    expect(screen.getByText(TEXT.titleAccount)).toBeTruthy();
    expect(screen.getByText(TEXT.bodyAccount)).toBeTruthy();
    expect(screen.queryByText(TEXT.titleLocal)).toBeNull();
    expect(confirmButton().props.accessibilityLabel).toBe(TEXT.confirmAccount);

    await fireEvent.press(confirmButton());
    expect(removeAccount).toHaveBeenCalledTimes(1);
    expect(wipe).not.toHaveBeenCalled();
    expect(screen.getByText(TEXT.alsoLocal)).toBeTruthy();
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

  it('deletes the account, shows the toast and the done line, then asks about the phone', async () => {
    await renderSheet(signedIn('apple'));
    await fireEvent.press(confirmButton());

    expect(removeAccount).toHaveBeenCalledTimes(1);
    expect(wipe).not.toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith(TEXT.done);
    expect(mockSession.current.user).toBeNull();
    const done = screen.getByTestId('delete-done');
    expect(done.props.children).toBe(TEXT.done);
    expect(done.props.accessibilityLiveRegion).toBeUndefined();
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

  it('shows the network alert after an offline delete, wipes nothing, and a second press retries', async () => {
    removeAccount.mockImplementationOnce(deleteSignsOut({ ok: false, error: 'offline' }));
    await renderSheet(signedIn('email'));
    await fireEvent.press(confirmButton());

    const alert = screen.getByTestId('delete-error');
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(alert.props.accessibilityLiveRegion).toBe('assertive');
    expect(alert.props.children).toBe(TEXT.network);
    expect(screen.queryByText(TEXT.failed)).toBeNull();
    expect(screen.getByText(TEXT.titleAccount)).toBeTruthy();
    expect(mockShow).not.toHaveBeenCalled();
    expect(wipe).not.toHaveBeenCalled();
    expect(isDisabled('btn-confirm-delete')).toBe(false);

    await fireEvent.press(confirmButton());
    expect(removeAccount).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('delete-error')).toBeNull();
    expect(screen.getByText(TEXT.alsoLocal)).toBeTruthy();
  });

  it.each(['server', 'rate_limited', 'invalid'] as const)(
    'shows "Brisanje nije uspjelo" for a %s failure',
    async (error) => {
      removeAccount.mockImplementationOnce(deleteSignsOut({ ok: false, error }));
      await renderSheet(signedIn('email'));
      await fireEvent.press(confirmButton());

      expect(screen.getByTestId('delete-error').props.children).toBe(TEXT.failed);
      expect(screen.queryByText(TEXT.network)).toBeNull();
      expect(isDisabled('btn-confirm-delete')).toBe(false);
    },
  );

  it('shows "Brisanje nije uspjelo" when the delete throws', async () => {
    removeAccount.mockRejectedValueOnce(new Error('db'));
    await renderSheet(signedIn('email'));
    await fireEvent.press(confirmButton());
    expect(screen.getByTestId('delete-error').props.children).toBe(TEXT.failed);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it('shows "Brisanje nije uspjelo" when the wipe throws, and lets the user try again', async () => {
    wipe.mockRejectedValueOnce(new Error('disk'));
    await renderSheet();
    await fireEvent.press(confirmButton());

    expect(screen.getByTestId('delete-error').props.children).toBe(TEXT.failed);
    expect(replace).not.toHaveBeenCalled();
    expect(isDisabled('btn-confirm-delete')).toBe(false);

    await fireEvent.press(confirmButton());
    expect(wipe).toHaveBeenCalledTimes(2);
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('disables both buttons and shows a spinner while a call is pending; a double press makes one call', async () => {
    const call = held<DeleteAccountResult>();
    removeAccount.mockReturnValueOnce(call.promise);
    // No stored-session answer to lean on: the account texts must hold through the sign-out on their own.
    await renderSheet(signedIn('email'), false);
    expect(spinner()).toBeNull();
    await fireEvent.press(confirmButton());
    await fireEvent.press(confirmButton());

    expect(removeAccount).toHaveBeenCalledTimes(1);
    expect(isDisabled('btn-confirm-delete')).toBe(true);
    expect(isDisabled('btn-cancel-delete')).toBe(true);
    expect(confirmButton().props.accessibilityState.busy).toBe(true);
    const busy = spinner();
    expect(busy).not.toBeNull();
    expect(busy?.props.accessibilityElementsHidden).toBe(true);
    expect(busy?.props.importantForAccessibility).toBe('no-hide-descendants');
    // The sign-out lands before the call returns: the account texts stay until the second step.
    mockSession.current = GUEST;
    await screen.rerender(withProviders(<BrisanjeScreen />));
    expect(screen.getByText(TEXT.titleAccount)).toBeTruthy();
    expect(screen.queryByText(TEXT.titleLocal)).toBeNull();

    await act(async () => call.resolve({ ok: true }));
    expect(screen.getByText(TEXT.alsoLocal)).toBeTruthy();
    expect(isDisabled('btn-confirm-delete')).toBe(false);
    expect(isDisabled('btn-keep-local')).toBe(false);
    expect(spinner()).toBeNull();
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
