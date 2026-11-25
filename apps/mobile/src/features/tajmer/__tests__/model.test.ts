import { at } from '@/test/utils';
import type { FastingSession } from '@/db/repo';
import { hm, milestones, resultMessage, timerModel, weekBars } from '../model';

const START = at('2026-12-02T16:30');
const HOUR = 3600e3;
const session = (over: Partial<FastingSession> = {}): FastingSession => ({
  id: 's',
  startedAt: START,
  endedAt: null,
  targetHours: 16,
  kind: 'if',
  ...over,
});

describe('timerModel', () => {
  it('idle: nothing elapsed, goal from the plan', () => {
    expect(timerModel(null, 14, START)).toMatchObject({
      state: 'idle',
      goalHours: 14,
      elapsedMs: 0,
      progress: 0,
      endsAt: null,
    });
  });

  it('fasting: elapsed, progress and end time follow the session', () => {
    const m = timerModel(session(), 12, START + 4 * HOUR);
    expect(m).toMatchObject({ state: 'fasting', goalHours: 16, elapsedMs: 4 * HOUR, progress: 0.25 });
    expect(m.endsAt).toBe(START + 16 * HOUR);
  });

  it('the goal comes from the session, not from the plan chosen later', () => {
    expect(timerModel(session({ targetHours: 14 }), 16, START).goalHours).toBe(14);
  });

  it('reaches the window exactly at the goal and the ring stays full', () => {
    expect(timerModel(session(), 16, START + 16 * HOUR - 1).state).toBe('fasting');
    const m = timerModel(session(), 16, START + 20 * HOUR);
    expect(m).toMatchObject({ state: 'window', progress: 1 });
    expect(m.elapsedMs).toBe(20 * HOUR);
  });

  it('a clock before the start never gives a negative time', () => {
    expect(timerModel(session(), 16, START - 5000).elapsedMs).toBe(0);
  });
});

describe('helpers', () => {
  it('hm splits hours and minutes', () => {
    expect(hm(8 * HOUR + 15 * 60e3 + 59e3)).toEqual({ h: 8, m: 15 });
    expect(hm(-1)).toEqual({ h: 0, m: 0 });
  });

  it('stop messages: done at the goal, kind message before it', () => {
    expect(resultMessage(session({ endedAt: START + 16 * HOUR + 600e3 }))).toBe('Post je završen: 16 h 10 min.');
    expect(resultMessage(session({ endedAt: START + 3 * HOUR + 5 * 60e3 }))).toBe(
      'Završio si poslije 3 h 5 min. I to se računa.',
    );
  });

  it('milestones only below the goal', () => {
    expect(milestones(16)).toEqual([12, 14]);
    expect(milestones(14)).toEqual([12]);
    expect(milestones(12)).toEqual([]);
  });

  it('week bars scale to the goal or the longest fast', () => {
    const days = [
      { n: 1, hours: 8, running: false },
      { n: 2, hours: 20, running: true },
    ];
    expect(weekBars(days, 16).map((b) => b.ratio)).toEqual([0.4, 1]);
    expect(weekBars([{ n: 1, hours: 4, running: false }], 16)[0]!.ratio).toBe(0.25);
  });
});
