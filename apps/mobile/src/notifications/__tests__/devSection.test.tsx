import { act, fireEvent, render, screen } from '@testing-library/react-native';
import NotificationsSection from '@/features/dev/sections/notifications';
import { listScheduled, rescheduleAll, sendTestNotification } from '@/notifications';
import { at, withProviders } from '@/test/utils';

// The real ToastProvider keeps a 2.6 s timer alive after the run, so the toast is a spy here.
const mockShow = jest.fn();
jest.mock('@/components', () => ({
  ...jest.requireActual('@/components'),
  useToast: () => ({ show: (message: string) => mockShow(message) }),
}));
jest.mock('@/notifications', () => ({
  listScheduled: jest.fn(),
  rescheduleAll: jest.fn(),
  sendTestNotification: jest.fn(),
}));

const list = jest.mocked(listScheduled);
const reschedule = jest.mocked(rescheduleAll);
const sendTest = jest.mocked(sendTestNotification);

const EVENING = { id: 'plan:eve:20788', at: at('2026-12-01T20:00'), title: 'Sutra je post na vodi', body: '' };
const IFTAR = { id: 'plan:iftar:20857', at: at('2027-02-08T17:07'), title: 'Akšam je, 17:07', body: '' };

const renderSection = () => render(withProviders(<NotificationsSection />));
const press = (testID: string) => act(async () => fireEvent.press(screen.getByTestId(testID)));

beforeEach(() => {
  // clearAllMocks, not resetAllMocks: a reset would also wipe the React Native mocks of jest.setup.js.
  jest.clearAllMocks();
  list.mockResolvedValue([]);
  reschedule.mockResolvedValue();
});

describe('dev screen: notifications section', () => {
  it('says so when nothing is pending', async () => {
    await renderSection();
    expect(await screen.findByText('Nema zakazanih podsjetnika.')).toBeTruthy();
  });

  it('lists the pending reminders with their Podgorica time and id', async () => {
    list.mockResolvedValue([EVENING, IFTAR]);
    await renderSection();

    expect(await screen.findByText('Zakazano: 2')).toBeTruthy();
    expect(screen.getByText('Sutra je post na vodi')).toBeTruthy();
    expect(screen.getByText('1.12. 20:00  plan:eve:20788')).toBeTruthy();
    expect(screen.getByText('8.2. 17:07  plan:iftar:20857')).toBeTruthy();
  });

  it('"send test" sends the test notification and says it is on its way', async () => {
    sendTest.mockResolvedValue(true);
    await renderSection();
    await press('dev-notif-test');

    expect(sendTest).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith('Probno obavještenje stiže za 5 sekundi.');
  });

  it('"send test" says when notifications are not allowed', async () => {
    sendTest.mockResolvedValue(false);
    await renderSection();
    await press('dev-notif-test');
    expect(mockShow).toHaveBeenCalledWith('Obavještenja nisu dozvoljena na ovom telefonu.');
  });

  it('"reschedule" plans again and shows the new list', async () => {
    await renderSection();
    list.mockResolvedValue([EVENING]);
    await press('dev-notif-reschedule');

    expect(reschedule).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Zakazano: 1')).toBeTruthy();
  });
});
