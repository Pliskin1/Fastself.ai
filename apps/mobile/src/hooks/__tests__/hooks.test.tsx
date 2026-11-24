import { dayPlan, nextDays, rangeStats, toDayNum } from '@fastself/core';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { dayMarks } from '@/db/repo';
import { useDayPlan, useNow, useRange, useSettings, useToday, useUpdateSettings } from '@/hooks';
import { freezeClock, setDevClock } from '@/lib/clock';
import { getSettings, updateSettings } from '@/store/settings';
import { at, fixtureSettings, installTestDb } from '@/test/utils';

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: number) =>
    jest.requireActual<typeof import('react')>('react').useRef({ value: initial }).current,
}));

const DEC_2 = toDayNum(2026, 12, 2);

function start(settings = fixtureSettings(), now = at('2026-12-02T16:30')): void {
  installTestDb();
  updateSettings(settings);
  freezeClock(now);
}

afterEach(() => {
  freezeClock(null);
  setDevClock(null);
  jest.useRealTimers();
});

describe('useSettings and useUpdateSettings', () => {
  it('returns the stored settings on the first render', async () => {
    start(fixtureSettings({ orthodox: true, strictness: 'ulje', city: 'bar' }));
    const { result } = await renderHook(() => useSettings());
    expect(result.current.practices.orthodox).toBe(true);
    expect(result.current.strictness).toBe('ulje');
    expect(result.current.city).toBe('bar');
    expect(result.current.onboarded).toBe(true);
  });

  it('an update re-renders every reader and is saved', async () => {
    start();
    const reader = await renderHook(() => useSettings());
    const writer = await renderHook(() => useUpdateSettings());
    const update = writer.result.current;

    await act(async () => update({ practices: { ...reader.result.current.practices, ifOn: true }, ifPlan: 14 }));

    expect(reader.result.current.practices.ifOn).toBe(true);
    expect(reader.result.current.ifPlan).toBe(14);
    expect(getSettings().ifPlan).toBe(14);
    await writer.rerender(undefined);
    expect(writer.result.current).toBe(update); // the function is stable across renders
  });
});

describe('useNow and useToday', () => {
  it('gives the app time: epoch ms, minutes from Podgorica midnight and the day', async () => {
    start();
    const now = await renderHook(() => useNow());
    const today = await renderHook(() => useToday());
    expect(now.result.current.now.value).toBe(at('2026-12-02T16:30'));
    expect(now.result.current.minute).toBe(16 * 60 + 30);
    expect(today.result.current).toBe(DEC_2);
  });

  it('follows the clock into the next minute and across midnight', async () => {
    start();
    const now = await renderHook(() => useNow());
    const today = await renderHook(() => useToday());

    await act(async () => freezeClock(at('2026-12-02T16:31:20')));
    expect(now.result.current.minute).toBe(16 * 60 + 31);
    expect(now.result.current.now.value).toBe(at('2026-12-02T16:31:20'));
    expect(today.result.current).toBe(DEC_2);

    await act(async () => freezeClock(at('2026-12-03T00:00')));
    expect(now.result.current.minute).toBe(0);
    expect(today.result.current).toBe(DEC_2 + 1);
  });

  it('ticks every second in the shared value but re-renders only once a minute', async () => {
    installTestDb();
    jest.useFakeTimers({ now: Date.UTC(2026, 10, 24, 9, 0, 0) });
    setDevClock('2026-12-02T16:30');
    let renders = 0;
    const { result } = await renderHook(() => {
      renders += 1;
      return useNow();
    });
    const rendersAtStart = renders;

    await act(async () => {
      jest.advanceTimersByTime(59_000);
    });
    expect(result.current.now.value).toBe(at('2026-12-02T16:30:59'));
    expect(result.current.minute).toBe(16 * 60 + 30);
    expect(renders).toBe(rendersAtStart);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.now.value).toBe(at('2026-12-02T16:31'));
    expect(result.current.minute).toBe(16 * 60 + 31);
    expect(renders).toBe(rendersAtStart + 1);
  });

  it('stops ticking when the component unmounts', async () => {
    installTestDb();
    jest.useFakeTimers({ now: Date.UTC(2026, 10, 24, 9, 0, 0) });
    const remove = jest.fn();
    const appState = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove } as never);
    const { result, unmount } = await renderHook(() => useNow());
    const { now } = result.current;

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    const atUnmount = now.value;
    expect(atUnmount).toBe(Date.UTC(2026, 10, 24, 9, 0, 2));

    await unmount();
    jest.advanceTimersByTime(5000);
    expect(now.value).toBe(atUnmount); // no tick reaches the old shared value
    expect(remove).toHaveBeenCalledTimes(1); // and the clock let go of AppState: nobody listens any more
    appState.mockRestore();
  });
});

describe('useDayPlan', () => {
  it('orthodox + IF 16 on 2 Dec 2026: Post na vodi, window 12:00–20:00 (TESTING.md §3.5)', async () => {
    start(fixtureSettings({ orthodox: true, ifOn: true, ifPlan: 16 }));
    const { result } = await renderHook(() => useDayPlan());
    expect(result.current.n).toBe(DEC_2);
    expect(result.current.level).toBe('voda');
    expect(result.current.title).toBe('Post na vodi');
    expect(result.current.sub).toBe('Božićni post, 5. dan od 40');
    expect(result.current.window).toMatchObject({ start: 12 * 60, end: 20 * 60, kind: 'if' });
  });

  it('ramadan on 8 Feb 2027: 1. ramazan, window from 17:06 (TESTING.md §3.5)', async () => {
    start(fixtureSettings({ ramadan: true }), at('2027-02-08T16:30'));
    const { result } = await renderHook(() => useDayPlan());
    expect(result.current.title).toBe('1. ramazan');
    expect(result.current.window?.start).toBe(17 * 60 + 6);
  });

  it('gives the plan of the day that is asked for', async () => {
    start(fixtureSettings({ orthodox: true }));
    const day = toDayNum(2026, 12, 4);
    const { result } = await renderHook(() => useDayPlan(day));
    expect(result.current).toEqual(dayPlan(day, getSettings()));
  });

  it('changes at once when the settings change or an exception is set', async () => {
    start(fixtureSettings({ orthodox: true }));
    const { result } = await renderHook(() => useDayPlan());
    expect(result.current.level).toBe('voda');

    await act(async () => updateSettings({ strictness: 'ulje' }));
    expect(result.current.level).toBe('ulje');

    await act(async () => dayMarks.setException(DEC_2, 'zdravlje'));
    expect(result.current.exception).toBe('zdravlje');
    expect(result.current.level).toBe('mrsno');

    await act(async () => dayMarks.clear(DEC_2));
    expect(result.current.exception).toBeNull();
  });

  it('moves to the next day at midnight', async () => {
    start(fixtureSettings({ orthodox: true }), at('2026-12-02T23:59'));
    const { result } = await renderHook(() => useDayPlan());
    expect(result.current.n).toBe(DEC_2);
    await act(async () => freezeClock(at('2026-12-03T00:00')));
    expect(result.current.n).toBe(DEC_2 + 1);
  });
});

describe('useRange', () => {
  it.each([7, 30] as const)('%i days: the plans and the statistics come from core', async (days) => {
    start(fixtureSettings({ orthodox: true, ramadan: true }));
    const { result } = await renderHook(() => useRange(DEC_2, days));
    expect(result.current.plans).toHaveLength(days);
    expect(result.current.plans).toEqual(nextDays(DEC_2, days, getSettings()));
    expect(result.current.stats).toEqual(rangeStats(DEC_2, days, getSettings()));
    expect(result.current.stats.days).toBe(days);
  });

  it('keeps the same result object until the range or the settings change', async () => {
    start(fixtureSettings({ orthodox: true }));
    const { result, rerender } = await renderHook(() => useRange(DEC_2, 7));
    const first = result.current;
    await rerender(undefined);
    expect(result.current).toBe(first);
    await act(async () => updateSettings({ strictness: 'riba' }));
    expect(result.current).not.toBe(first);
  });
});
