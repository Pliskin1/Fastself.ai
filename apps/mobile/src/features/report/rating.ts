import type { ReportInput } from '@/lib/api';
import { RULE_PACK_VERSION } from '@fastself/core';

export type Score = 1 | 2 | 3 | 4 | 5;

/** Follow-up chips: what to fix for a low score, what works for a high one. Keys of copy `ocjena.chip.*`. */
export const LOW_CHIPS = ['rule', 'time', 'design', 'speed', 'missing', 'other'] as const;
export const HIGH_CHIPS = ['dial', 'calendar', 'timer', 'design', 'reminders', 'simple'] as const;
export type ChipId = (typeof LOW_CHIPS)[number] | (typeof HIGH_CHIPS)[number];

export const isHigh = (score: Score): boolean => score >= 4;
export const chipsFor = (score: Score): readonly ChipId[] => (isHigh(score) ? HIGH_CHIPS : LOW_CHIPS);

export const MAX_COMMENT = 600;

/**
 * A rating travels as an ordinary `reports` row (type 'drugo', context 'ocjena'), so the server needs no change.
 * The message is readable in the dashboard, e.g. "Ocjena 4/5 · Kalendar, Tajmer · Super je".
 */
export function buildRating(args: {
  score: Score;
  chipLabels: string[];
  comment: string;
  appVersion: string;
}): ReportInput {
  const parts = [`Ocjena ${args.score}/5`];
  if (args.chipLabels.length > 0) parts.push(args.chipLabels.join(', '));
  const comment = args.comment.trim().slice(0, MAX_COMMENT);
  if (comment) parts.push(comment);
  return {
    type: 'drugo',
    day: null,
    context: `ocjena:${args.score}`,
    message: parts.join(' · '),
    rule_pack_version: RULE_PACK_VERSION,
    app_version: args.appVersion,
  };
}
