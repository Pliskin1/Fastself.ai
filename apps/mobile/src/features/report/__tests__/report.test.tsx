import { RULE_PACK_VERSION } from '@fastself/core';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { sendReport, type ApiResult } from '@/lib/api';
import { at, withProviders } from '@/test/utils';
import { ReportForm } from '../ReportForm';

// The real ToastProvider keeps a 2.6 s timer alive after the run, so the toast is a spy here.
const mockShow = jest.fn();
jest.mock('@/components', () => ({
  ...jest.requireActual('@/components'),
  useToast: () => ({ show: (message: string) => mockShow(message) }),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/lib/api', () => ({ sendReport: jest.fn() }));

const send = sendReport as jest.MockedFunction<typeof sendReport>;
const NOW = at('2026-12-02T16:30');
const SENT = 'Prijava je poslata. Hvala.';

const renderForm = (props: { date?: string; context?: string } = {}) =>
  render(withProviders(<ReportForm {...props} />, { now: NOW }));

const sendButton = () => screen.getByTestId('btn-send-report');
const isDisabled = () => sendButton().props.accessibilityState.disabled === true;

beforeEach(() => {
  jest.clearAllMocks();
  send.mockResolvedValue({ ok: true, data: null });
});

describe('prijava greske sheet', () => {
  it('shows the four type chips, the note and the context line', async () => {
    await renderForm({ date: '2026-12-02', context: 'danas' });
    expect(screen.getByText('Pogrešno pravilo')).toBeTruthy();
    expect(screen.getByText('Pogrešno vrijeme')).toBeTruthy();
    expect(screen.getByText('Problem sa receptom')).toBeTruthy();
    expect(screen.getByText('Nešto drugo')).toBeTruthy();
    expect(screen.getByText('Šaljemo samo ovaj opis, datum i verziju pravila. Bez imena i lokacije.')).toBeTruthy();
    expect(screen.getByText('Odnosi se na: Srijeda, 2. decembar, ekran Danas')).toBeTruthy();
    expect(screen.getByTestId('screen-prijava-greske')).toBeTruthy();
  });

  it('keeps send disabled without a type or under 3 characters', async () => {
    await renderForm();
    expect(isDisabled()).toBe(true);
    await fireEvent.changeText(screen.getByTestId('input-report'), 'ab');
    await fireEvent.press(screen.getByTestId('chip-report-pravilo'));
    expect(isDisabled()).toBe(true);
    await fireEvent.changeText(screen.getByTestId('input-report'), '  ab  ');
    expect(isDisabled()).toBe(true);
    await fireEvent.changeText(screen.getByTestId('input-report'), 'abc');
    expect(isDisabled()).toBe(false);
    await fireEvent.press(sendButton());
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('is a single choice with radio semantics', async () => {
    await renderForm();
    await fireEvent.press(screen.getByTestId('chip-report-vrijeme'));
    await fireEvent.press(screen.getByTestId('chip-report-recept'));
    expect(screen.getByTestId('chip-report-recept').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('chip-report-vrijeme').props.accessibilityState.selected).toBe(false);
    expect(screen.getByTestId('chip-report-recept').props.accessibilityRole).toBe('radio');
  });

  it('sends exactly the expected row, with date and context from the params', async () => {
    await renderForm({ date: '2026-12-02', context: 'danas' });
    await fireEvent.press(screen.getByTestId('chip-report-recept'));
    await fireEvent.changeText(screen.getByTestId('input-report'), '  Riba nije dozvoljena  ');
    await fireEvent.press(sendButton());
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toEqual({
      type: 'recept',
      day: '2026-12-02',
      context: 'danas',
      message: 'Riba nije dozvoljena',
      rule_pack_version: RULE_PACK_VERSION,
      app_version: expect.any(String),
    });
  });

  it('sends null day and context without params, and drops an invalid date', async () => {
    await renderForm({ date: '2026-02-31' });
    await fireEvent.press(screen.getByTestId('chip-report-drugo'));
    await fireEvent.changeText(screen.getByTestId('input-report'), 'Nešto ne radi');
    await fireEvent.press(sendButton());
    expect(send.mock.calls[0]?.[0]).toMatchObject({ type: 'drugo', day: null, context: null });
    expect(screen.queryByText(/Odnosi se na: .*februar/)).toBeNull();
  });

  it('cuts the context to 200 characters', async () => {
    await renderForm({ context: 'x'.repeat(250) });
    await fireEvent.press(screen.getByTestId('chip-report-drugo'));
    await fireEvent.changeText(screen.getByTestId('input-report'), 'abc');
    await fireEvent.press(sendButton());
    expect(send.mock.calls[0]?.[0].context).toHaveLength(200);
  });

  it('shows the toast and closes the sheet on success', async () => {
    await renderForm();
    await fireEvent.press(screen.getByTestId('chip-report-pravilo'));
    await fireEvent.changeText(screen.getByTestId('input-report'), 'Pogrešno pravilo za petak');
    await fireEvent.press(sendButton());
    expect(mockShow).toHaveBeenCalledWith(SENT);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('does not close another screen when the sheet was swiped away during the send', async () => {
    let resolve: (r: ApiResult<null>) => void = () => undefined;
    send.mockReturnValueOnce(new Promise<ApiResult<null>>((r) => (resolve = r)));
    const view = await renderForm();
    await fireEvent.press(screen.getByTestId('chip-report-pravilo'));
    await fireEvent.changeText(screen.getByTestId('input-report'), 'Pogrešno pravilo');
    await fireEvent.press(sendButton());
    await view.unmount();
    await act(async () => resolve({ ok: true, data: null }));
    expect(mockShow).toHaveBeenCalledWith(SENT);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('shows the network error on failure, keeps the input and retries with the same button', async () => {
    send.mockResolvedValueOnce({ ok: false, error: 'offline' });
    await renderForm();
    await fireEvent.press(screen.getByTestId('chip-report-vrijeme'));
    await fireEvent.changeText(screen.getByTestId('input-report'), 'Pogrešno vrijeme');
    await fireEvent.press(sendButton());
    expect(screen.getByText('Veza nije uspjela. Provjeri internet i pokušaj ponovo.')).toBeTruthy();
    expect(screen.getByTestId('input-report').props.value).toBe('Pogrešno vrijeme');
    expect(screen.getByTestId('chip-report-vrijeme').props.accessibilityState.selected).toBe(true);
    expect(router.back).not.toHaveBeenCalled();
    expect(isDisabled()).toBe(false);

    await fireEvent.press(sendButton());
    expect(send).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Veza nije uspjela. Provjeri internet i pokušaj ponovo.')).toBeNull();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('does not send twice while a send is pending', async () => {
    let resolve: (r: ApiResult<null>) => void = () => undefined;
    send.mockReturnValueOnce(new Promise<ApiResult<null>>((r) => (resolve = r)));
    await renderForm();
    await fireEvent.press(screen.getByTestId('chip-report-pravilo'));
    await fireEvent.changeText(screen.getByTestId('input-report'), 'Pogrešno pravilo');
    await fireEvent.press(sendButton());
    await fireEvent.press(sendButton());
    expect(send).toHaveBeenCalledTimes(1);
    expect(isDisabled()).toBe(true);
    await act(async () => resolve({ ok: true, data: null }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
