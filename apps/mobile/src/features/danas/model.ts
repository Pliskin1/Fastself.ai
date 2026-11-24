import { formatHm, inWindow, pl, type DayPlan, type FoodLevel } from '@fastself/core';
import { t } from '@/copy/sr';

export interface DialModel {
  /** An eating window exists today. */
  hasWindow: boolean;
  /** "Do iftara", "Do zore", "Do kraja posta" or "Prozor za jelo još". Null without a window. */
  label: string | null;
  sub: string | null;
  /** Minutes from the plan day's midnight the countdown runs to. Always at or after the current minute. */
  targetMin: number | null;
  /** The eating arc, start in 0..1439 and length in minutes. */
  eat: { start: number; length: number } | null;
  /** Where the current phase began, in 0..1439. */
  phaseStart: number | null;
  legend: { fast: string; eat: string } | null;
  /** Big italic word when there is no window ("voda", "ulje", "riba", "mrsno"). */
  word: string | null;
  level: FoodLevel;
}

const WORD_KEY: Record<FoodLevel, string> = {
  voda: 'voda',
  ulje: 'ulje',
  riba: 'riba',
  bezmesa: 'bezMesa',
  mrsno: 'mrsno',
};

const wrap = (m: number): number => ((Math.round(m) % 1440) + 1440) % 1440;

/** The first time at or after `minute` that shows `clock` on the wall. */
function nextAt(clock: number, minute: number): number {
  const target = wrap(clock);
  return target >= minute ? target : target + 1440;
}

export function wordFor(level: FoodLevel): string {
  return t(`day.word.${WORD_KEY[level]}`);
}

/** Everything the dial needs, from the plan and the current minute of the day (0..1439). Pure. */
export function dialModel(plan: DayPlan, minute: number): DialModel {
  const w = plan.window;
  if (!w) {
    return {
      hasWindow: false,
      label: null,
      sub: null,
      targetMin: null,
      eat: null,
      phaseStart: null,
      legend: null,
      word: wordFor(plan.level),
      level: plan.level,
    };
  }

  const inside = inWindow(minute, w);
  const from = formatHm(w.start);
  const to = formatHm(w.end);
  const windowSub = t('dial.sub.window', { from, to });
  const eatLength = (((w.end - w.start) % 1440) + 1440) % 1440 || 1440;

  let label: string;
  let sub: string;
  let clock: number;
  if (w.kind === 'if' || w.ifInside) {
    label = inside ? t('dial.windowLeft') : t('dial.toFastEnd');
    sub = windowSub;
    clock = inside ? w.end : w.start;
  } else if (inside) {
    label = t('dial.toFajr');
    sub = t('dial.sub.fajr', { time: to });
    clock = w.end;
  } else {
    label = t('dial.toIftar');
    sub = t('dial.sub.iftar', { time: from });
    clock = w.start;
  }

  return {
    hasWindow: true,
    label,
    sub,
    targetMin: nextAt(clock, minute),
    eat: { start: wrap(w.start), length: eatLength },
    phaseStart: wrap(inside ? w.start : w.end),
    legend: {
      fast: t('danas.legend.fast', { from: to, to: from }),
      eat: t('danas.legend.eat', { from, to }),
    },
    word: null,
    level: plan.level,
  };
}

/** Screen-reader sentence of the dial, rebuilt once a minute. */
export function dialA11y(model: DialModel, remainingMinutes: number): string {
  if (!model.hasWindow) return model.word ?? '';
  const h = Math.floor(remainingMinutes / 60);
  const m = remainingMinutes % 60;
  return t('dial.a11y', {
    label: model.label ?? '',
    h,
    hWord: pl(h, ['sat', 'sata', 'sati']),
    m,
    mWord: pl(m, ['minut', 'minuta', 'minuta']),
    sub: model.sub ?? '',
  });
}

const levelKey = {
  voda: 'day.level.voda',
  ulje: 'day.level.ulje',
  riba: 'day.level.riba',
  bezmesa: 'day.level.bezMesa',
  mrsno: 'day.level.mrsno',
} as const;
export const levelTitle = (level: FoodLevel): string => t(levelKey[level]);
