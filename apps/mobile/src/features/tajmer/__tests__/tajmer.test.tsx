import { toDayNum } from '@fastself/core';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import TajmerScreen from '@/app/(tabs)/tajmer';
import { fastingSessions } from '@/db/repo';
import { freezeClock } from '@/lib/clock';
import { cancelIfEnd, scheduleIfEnd } from '@/notifications';
import { getSettings } from '@/store/settings';
import { at, fixtureSettings, withProviders } from '@/test/utils';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/notifications', () => ({ scheduleIfEnd: jest.fn(), cancelIfEnd: jest.fn() }));

const HOUR = 3600e3;
const NOW = at('2026-12-02T16:30');
const ui = (patch = {}) =>
  withProviders(<TajmerScreen />, { settings: fixtureSettings({ ifOn: true, ifPlan: 16, ...patch }), now: NOW });

beforeEach(() => jest.clearAllMocks());

describe('Tajmer', () => {
  it('IF off: the card sends the user to the practices', async () => {
    await render(ui({ ifOn: false }));
    expect(screen.getByText('IF nije uključen')).toBeTruthy();
    expect(screen.queryByTestId('timer-toggle')).toBeNull();
    await fireEvent.press(screen.getByTestId('btn-enable-if'));
    expect(router.push).toHaveBeenCalledWith('/prakse');
  });

  it('minor: IF is not available', async () => {
    await render(ui({ minor: true }));
    expect(screen.getByText('Nije dostupno')).toBeTruthy();
    expect(screen.queryByTestId('timer-toggle')).toBeNull();
  });

  it('idle: shows the goal, empty stats and the start button', async () => {
    await render(ui());
    expect(screen.getByText('Pokreni kad završiš posljednji obrok')).toBeTruthy();
    expect(screen.getByText('Cilj 16 h')).toBeTruthy();
    expect(screen.getByText('Započni post')).toBeTruthy();
    expect(screen.getByTestId('stat-start').props.children).toBe('—');
  });

  it('start stores the fast, shows times and schedules the end reminder', async () => {
    await render(ui());
    await fireEvent.press(screen.getByTestId('timer-toggle'));
    expect(fastingSessions.current()).toMatchObject({ startedAt: NOW, targetHours: 16 });
    expect(screen.getByText('Postiš')).toBeTruthy();
    expect(screen.getByText('Cilj 16 h, do 08:30')).toBeTruthy();
    expect(screen.getByTestId('stat-start').props.children).toBe('16:30');
    expect(screen.getByTestId('stat-end').props.children).toBe('08:30');
    expect(screen.getByText('Završi post')).toBeTruthy();
    expect(scheduleIfEnd).toHaveBeenCalledWith(NOW + 16 * HOUR);
  });

  it('after a force quit the timer is right: it reads the running fast and the clock', async () => {
    const element = ui();
    fastingSessions.start(16);
    await act(async () => freezeClock(NOW + 8 * HOUR + 15 * 60e3));
    await render(element);
    expect(screen.getByText('Postiš')).toBeTruthy();
    expect(screen.getByTestId('timer-ring').props.accessibilityLabel).toBe('Postiš. Proteklo 8 h 15 min od 16 h.');
    expect(screen.getByText('Završi post')).toBeTruthy();
  });

  it('opens the eating window once the goal is reached', async () => {
    const element = ui();
    fastingSessions.start(16);
    await act(async () => freezeClock(NOW + 17 * HOUR));
    await render(element);
    expect(screen.getByText('Prozor za jelo je otvoren')).toBeTruthy();
  });

  it('stopping early gives the kind message, cancels the reminder and fills today in the chart', async () => {
    await render(ui());
    await fireEvent.press(screen.getByTestId('timer-toggle'));
    await act(async () => freezeClock(NOW + 3 * HOUR));
    await fireEvent.press(screen.getByTestId('timer-toggle'));
    expect(screen.getByText('Završio si poslije 3 h 0 min. I to se računa.')).toBeTruthy();
    expect(fastingSessions.current()).toBeNull();
    expect(cancelIfEnd).toHaveBeenCalled();
    expect(screen.getByText('Započni post')).toBeTruthy();
    const today = toDayNum(2026, 12, 2);
    expect(screen.getByTestId(`bar-${today}`).props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: '19%' })]),
    );
  });

  it('stopping at the goal says it is done', async () => {
    await render(ui());
    await fireEvent.press(screen.getByTestId('timer-toggle'));
    await act(async () => freezeClock(NOW + 16 * HOUR + 10 * 60e3));
    await fireEvent.press(screen.getByTestId('timer-toggle'));
    expect(screen.getByText('Post je završen: 16 h 10 min.')).toBeTruthy();
  });

  it('the plan can be changed while idle', async () => {
    await render(ui());
    await fireEvent.press(screen.getByText('14:10'));
    expect(getSettings().ifPlan).toBe(14);
    expect(screen.getByText('Cilj 14 h')).toBeTruthy();
  });

  it('on an Orthodox fast day the combo note names the level', async () => {
    await render(ui({ orthodox: true, strictness: 'ulje' }));
    expect(screen.getByTestId('timer-combo')).toBeTruthy();
    expect(screen.getByText(/Danas je i post na ulju/)).toBeTruthy();
  });
});
