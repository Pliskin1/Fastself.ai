import { AppState } from 'react-native';
import { freezeClock, nowMs, parseIsoLocal, setDevClock, subscribeClock } from '@/lib/clock';

const REAL_START = Date.UTC(2026, 10, 24, 9, 0, 0, 250); // 24 Nov 2026, 10:00:00.250 in Podgorica

beforeEach(() => {
  jest.useFakeTimers({ now: REAL_START });
  setDevClock(null);
});
afterEach(() => {
  freezeClock(null);
  setDevClock(null);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('parseIsoLocal', () => {
  it('reads the time as Podgorica local time, in winter and in summer', () => {
    expect(parseIsoLocal('2026-12-02T16:30')).toBe(Date.UTC(2026, 11, 2, 15, 30)); // CET, UTC+1
    expect(parseIsoLocal('2026-07-01T12:00')).toBe(Date.UTC(2026, 6, 1, 10, 0)); // CEST, UTC+2
    expect(parseIsoLocal('2027-02-08T00:00:45')).toBe(Date.UTC(2027, 1, 7, 23, 0, 45));
  });

  it('returns null for anything that is not a real local date and time', () => {
    for (const bad of ['', '2026-12-02', '2026-12-02 16:30', '2026-13-01T10:00', '2026-02-30T10:00']) {
      expect(parseIsoLocal(bad)).toBeNull();
    }
    for (const bad of ['2026-12-02T24:00', '2026-12-02T10:60', '2026-12-02T10:00:60', '2026-12-02T1:00']) {
      expect(parseIsoLocal(bad)).toBeNull();
    }
  });
});

describe('dev clock', () => {
  it('follows the real time until a dev time is set', () => {
    expect(nowMs()).toBe(REAL_START);
    jest.advanceTimersByTime(5000);
    expect(nowMs()).toBe(REAL_START + 5000);
  });

  it('jumps to the dev time and keeps ticking from there', () => {
    setDevClock('2026-12-02T16:30');
    expect(nowMs()).toBe(Date.UTC(2026, 11, 2, 15, 30));
    jest.advanceTimersByTime(90_000);
    expect(nowMs()).toBe(Date.UTC(2026, 11, 2, 15, 31, 30));
  });

  it('null returns to the real time, and an invalid value changes nothing', () => {
    setDevClock('2026-12-02T16:30');
    setDevClock('next tuesday');
    expect(nowMs()).toBe(Date.UTC(2026, 11, 2, 15, 30));
    setDevClock(null);
    expect(nowMs()).toBe(REAL_START);
  });

  it('a frozen clock stands still until it is released', () => {
    freezeClock(1000);
    jest.advanceTimersByTime(60_000);
    expect(nowMs()).toBe(1000);
    freezeClock(null);
    expect(nowMs()).toBe(REAL_START + 60_000);
  });
});

describe('subscribeClock', () => {
  it('ticks on every full second', () => {
    const listener = jest.fn();
    const stop = subscribeClock(listener);
    jest.advanceTimersByTime(749);
    expect(listener).toHaveBeenCalledTimes(0);
    jest.advanceTimersByTime(1); // 10:00:01.000
    expect(listener).toHaveBeenCalledTimes(1);
    expect(nowMs() % 1000).toBe(0);
    jest.advanceTimersByTime(3000);
    expect(listener).toHaveBeenCalledTimes(4);
    stop();
  });

  it('stops the timer when the last listener leaves', () => {
    const a = jest.fn();
    const b = jest.fn();
    const stopA = subscribeClock(a);
    const stopB = subscribeClock(b);
    jest.advanceTimersByTime(1000);
    stopA();
    jest.advanceTimersByTime(1000);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
    stopB();
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(5000);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('tells the listeners at once when the dev clock is set', () => {
    const listener = jest.fn();
    const stop = subscribeClock(listener);
    setDevClock('2026-12-02T16:30');
    expect(listener).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it('a frozen clock tells the listeners once and starts no timer', () => {
    const listener = jest.fn();
    const stop = subscribeClock(listener);
    freezeClock(Date.UTC(2026, 11, 2, 15, 30));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(10_000);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  it('ticks at once when the app returns to the foreground', () => {
    const remove = jest.fn();
    const addEventListener = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove } as never);
    const listener = jest.fn();
    const stop = subscribeClock(listener);
    const onChange = addEventListener.mock.calls[0]?.[1];

    onChange?.('background');
    expect(listener).toHaveBeenCalledTimes(0);
    onChange?.('active');
    expect(listener).toHaveBeenCalledTimes(1);

    stop();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
