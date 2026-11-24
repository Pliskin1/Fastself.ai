import { DEFAULT_SETTINGS, toDayNum } from '@fastself/core';
import { router } from 'expo-router';
import { consents, fastingSessions } from '@/db/repo';
import { freezeClock, nowMs, setDevClock } from '@/lib/clock';
import { applyDevLink } from '@/lib/dev';
import { getSettings, updateSettings } from '@/store/settings';
import { at, installTestDb } from '@/test/utils';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

const replace = jest.mocked(router.replace);
const REAL_START = Date.UTC(2026, 10, 24, 9, 0, 0); // 24 Nov 2026, 10:00 in Podgorica

beforeEach(() => {
  jest.useFakeTimers({ now: REAL_START });
  setDevClock(null);
  installTestDb();
  replace.mockClear();
});
afterEach(() => {
  freezeClock(null);
  setDevClock(null);
  jest.useRealTimers();
});

describe('applyDevLink', () => {
  it('ignores links that are not dev links', async () => {
    updateSettings({ onboarded: true, city: 'bar' });
    for (const url of ['fastself://danas?reset=1', 'fastself://devil?reset=1', 'https://fastself.ai/?reset=1', '']) {
      await applyDevLink(url);
    }
    expect(getSettings().city).toBe('bar');
    expect(replace).not.toHaveBeenCalled();
  });

  it('reset wipes local data and goes back to the start route', async () => {
    updateSettings({ onboarded: true, city: 'bar', allergies: ['gluten'] });
    consents.set('ai', true);
    fastingSessions.start(16);

    await applyDevLink('fastself://dev?reset=1');

    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, onboarded: false });
    expect(consents.get('ai')).toBe(false);
    expect(fastingSessions.current()).toBeNull();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it.each([
    ['orthodox-if', { orthodox: true, ramadan: false, nafila: false, ifOn: true }, 16],
    ['orthodox', { orthodox: true, ramadan: false, nafila: false, ifOn: false }, 16],
    ['ramadan-nafila', { orthodox: false, ramadan: true, nafila: true, ifOn: false }, 16],
    ['ramadan-if', { orthodox: false, ramadan: true, nafila: false, ifOn: true }, 16],
    ['if14', { orthodox: false, ramadan: false, nafila: false, ifOn: true }, 14],
  ] as const)('preset %s sets its practices, Podgorica, no allergies, onboarded', async (id, practices, ifPlan) => {
    updateSettings({ city: 'bar', allergies: ['gluten'], customAvoid: ['kivi'], strictness: 'riba' });

    await applyDevLink(`fastself://dev?preset=${id}`);

    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, practices, ifPlan, onboarded: true });
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('a preset without reset keeps the fasting history', async () => {
    const session = fastingSessions.start(14);
    await applyDevLink('fastself://dev?preset=if14');
    expect(fastingSessions.current()).toEqual(session);
  });

  it('date and time set the dev clock, which keeps ticking', async () => {
    await applyDevLink('fastself://dev?date=2026-12-02&time=16:30');
    expect(nowMs()).toBe(at('2026-12-02T16:30'));
    jest.advanceTimersByTime(60_000);
    expect(nowMs()).toBe(at('2026-12-02T16:31'));
    expect(replace).not.toHaveBeenCalled(); // nothing else was asked for
  });

  it('date alone keeps the time of day, and time alone keeps the date', async () => {
    await applyDevLink('fastself://dev?date=2027-02-08');
    expect(nowMs()).toBe(at('2027-02-08T10:00'));
    await applyDevLink('fastself://dev?time=7:40');
    expect(nowMs()).toBe(at('2027-02-08T07:40'));
  });

  it('reads a percent-encoded time', async () => {
    await applyDevLink('fastself://dev?date=2026-12-04&time=07%3A40');
    expect(nowMs()).toBe(at('2026-12-04T07:40'));
  });

  it.each(['danas', 'kalendar', 'plan', 'tajmer', 'profil'])('tab=%s opens that tab', async (tab) => {
    await applyDevLink(`fastself://dev?tab=${tab}`);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(`/(tabs)/${tab}`);
  });

  it('ignores parameters that do not parse and still applies the rest', async () => {
    updateSettings({ onboarded: true, city: 'bar' });
    await applyDevLink('fastself://dev?preset=keto&date=2026-13-45&time=99:99&tab=settings&reset=yes&%E0%A4%A=1');
    expect(getSettings().city).toBe('bar');
    expect(nowMs()).toBe(REAL_START);
    expect(replace).not.toHaveBeenCalled();

    await applyDevLink('fastself://dev?date=nope&tab=plan');
    expect(nowMs()).toBe(REAL_START);
    expect(replace).toHaveBeenCalledWith('/(tabs)/plan');
  });

  it('applies a full Maestro link: reset, preset, date, time and tab', async () => {
    updateSettings({ allergies: ['gluten'], exceptions: { [toDayNum(2026, 12, 2)]: 'zdravlje' } });

    await applyDevLink('fastself://dev?reset=1&preset=orthodox-if&date=2026-12-02&time=16:30&tab=danas');

    expect(getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      practices: { orthodox: true, ramadan: false, nafila: false, ifOn: true },
      onboarded: true,
    });
    expect(nowMs()).toBe(at('2026-12-02T16:30'));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/(tabs)/danas');
  });

  it('also accepts the link with another scheme or as a path', async () => {
    await applyDevLink('exp+fastself://dev?tab=plan');
    await applyDevLink('exp://192.168.1.5:8081/--/dev?tab=profil');
    expect(replace.mock.calls).toEqual([['/(tabs)/plan'], ['/(tabs)/profil']]);
  });
});
