import { formatHm, localFromEpoch, type IfPlan } from '@fastself/core';
import { t } from '@/copy/sr';
import type { FastDay, FastingSession } from '@/db/repo';

export type TimerState = 'idle' | 'fasting' | 'window';

const HOUR_MS = 3600e3;
const MINUTE_MS = 60e3;

export interface TimerModel {
  state: TimerState;
  goalHours: IfPlan;
  goalMs: number;
  elapsedMs: number;
  /** 0..1, capped at 1 once the goal is reached. */
  progress: number;
  startedAt: number | null;
  endsAt: number | null;
}

/** The timer from the running session (or none) and the current epoch ms. Pure. */
export function timerModel(session: FastingSession | null, planHours: IfPlan, now: number): TimerModel {
  const goalHours = session?.targetHours ?? planHours;
  const goalMs = goalHours * HOUR_MS;
  if (!session) {
    return { state: 'idle', goalHours, goalMs, elapsedMs: 0, progress: 0, startedAt: null, endsAt: null };
  }
  const elapsedMs = Math.max(0, now - session.startedAt);
  return {
    state: elapsedMs >= goalMs ? 'window' : 'fasting',
    goalHours,
    goalMs,
    elapsedMs,
    progress: Math.min(1, elapsedMs / goalMs),
    startedAt: session.startedAt,
    endsAt: session.startedAt + goalMs,
  };
}

/** Whole hours and minutes of a duration. */
export function hm(ms: number): { h: number; m: number } {
  const minutes = Math.max(0, Math.floor(ms / MINUTE_MS));
  return { h: Math.floor(minutes / 60), m: minutes % 60 };
}

/** "HH:MM" on the Podgorica wall clock. */
export const clockOf = (epochMs: number): string => formatHm(localFromEpoch(epochMs).minutes);

/** The kind message after stopping: done at or past the goal, a gentle "that counts too" before it. Never guilt. */
export function resultMessage(session: FastingSession): string {
  const ended = session.endedAt ?? session.startedAt;
  const spent = ended - session.startedAt;
  const { h, m } = hm(spent);
  return t(spent >= session.targetHours * HOUR_MS ? 'tajmer.done' : 'tajmer.early', { h, m });
}

export function stateLabel(state: TimerState): string {
  return t(`tajmer.state.${state === 'idle' ? 'idle' : state}`);
}

export function ringA11y(model: TimerModel): string {
  const { h, m } = hm(model.elapsedMs);
  return t('tajmer.ring.a11y', { state: stateLabel(model.state), h, m, goal: model.goalHours });
}

export interface Bar {
  n: number;
  hours: number;
  /** 0..1 of the tallest bar, which is at least the goal. */
  ratio: number;
  running: boolean;
}

export function weekBars(days: FastDay[], goalHours: number): Bar[] {
  const max = Math.max(goalHours, ...days.map((d) => d.hours));
  return days.map((d) => ({ n: d.n, hours: d.hours, ratio: d.hours / max, running: d.running }));
}

/** Where the 12 h and 14 h marks sit on a ring that ends at the goal. Marks at or past the goal are left out. */
export const milestones = (goalHours: number): number[] => [12, 14].filter((h) => h < goalHours);
