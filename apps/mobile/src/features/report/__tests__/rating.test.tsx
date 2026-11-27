import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ToastProvider } from '@/components';
import PrijavaGreskeScreen from '@/app/(sheets)/prijava-greske';
import { sendReport } from '@/lib/api';
import { withProviders } from '@/test/utils';
import { buildRating, chipsFor } from '../rating';

const mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/api', () => ({ sendReport: jest.fn() }));
const send = sendReport as jest.MockedFunction<typeof sendReport>;

const open = (mode?: string) => {
  for (const key of Object.keys(mockParams)) delete mockParams[key];
  if (mode) mockParams.mode = mode;
  return render(
    withProviders(
      <ToastProvider>
        <PrijavaGreskeScreen />
      </ToastProvider>,
    ),
  );
};

beforeEach(() => jest.clearAllMocks());

describe('rating model', () => {
  it('builds a reports row without server changes', () => {
    expect(
      buildRating({ score: 4, chipLabels: ['Kalendar', 'Tajmer'], comment: '  Super je ', appVersion: '1.0.0' }),
    ).toEqual(
      expect.objectContaining({
        type: 'drugo',
        day: null,
        context: 'ocjena:4',
        message: 'Ocjena 4/5 · Kalendar, Tajmer · Super je',
        app_version: '1.0.0',
      }),
    );
    expect(buildRating({ score: 2, chipLabels: [], comment: '', appVersion: '1' }).message).toBe('Ocjena 2/5');
  });

  it('low and high scores ask different things', () => {
    expect(chipsFor(2)).toContain('missing');
    expect(chipsFor(5)).toContain('timer');
  });
});

describe('Ocijeni aplikaciju', () => {
  it('the sheet opens in report mode and switches to rating', async () => {
    await open();
    expect(screen.getByTestId('btn-send-report')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ocijeni aplikaciju'));
    expect(screen.getByTestId('star-5')).toBeTruthy();
  });

  it('5 stars: chips, comment, send, then thanks', async () => {
    send.mockResolvedValue({ ok: true, data: null });
    await open('ocjena');
    await fireEvent.press(screen.getByTestId('star-5'));
    expect(screen.getByText('Odlično')).toBeTruthy();
    expect(screen.getByText('Šta ti se najviše dopada?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chip-feedback-timer'));
    await fireEvent.changeText(screen.getByTestId('input-feedback'), 'Tajmer je top');
    await fireEvent.press(screen.getByTestId('btn-send-feedback'));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'drugo', context: 'ocjena:5', message: 'Ocjena 5/5 · Tajmer · Tajmer je top' }),
    );
    expect(await screen.findByTestId('rating-thanks')).toBeTruthy();
    expect(screen.queryByTestId('btn-store-review')).toBeNull();
  });

  it('2 stars: asks what to fix and closes', async () => {
    send.mockResolvedValue({ ok: true, data: null });
    await open('ocjena');
    await fireEvent.press(screen.getByTestId('star-2'));
    expect(screen.getByText('Šta da popravimo?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-send-feedback'));
    expect(await screen.findByTestId('rating-thanks')).toBeTruthy();
    expect(screen.queryByTestId('btn-store-review')).toBeNull();
    await fireEvent.press(screen.getByTestId('btn-rating-done'));
    expect(router.back).toHaveBeenCalled();
  });

  it('a failed send keeps the input and shows an error', async () => {
    send.mockResolvedValue({ ok: false, error: 'offline' } as never);
    await open('ocjena');
    await fireEvent.press(screen.getByTestId('star-3'));
    await fireEvent.changeText(screen.getByTestId('input-feedback'), 'Sporo');
    await fireEvent.press(screen.getByTestId('btn-send-feedback'));
    expect(await screen.findByTestId('rating-error')).toBeTruthy();
    expect(screen.getByTestId('input-feedback').props.value).toBe('Sporo');
  });
});
