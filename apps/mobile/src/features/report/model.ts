import { parseIsoDate, RULE_PACK_VERSION } from '@fastself/core';
import type { ReportInput, ReportType } from '@/lib/api';

export const REPORT_TYPES: { type: ReportType; key: string; testID: string }[] = [
  { type: 'pravilo', key: 'report.type.rule', testID: 'chip-report-pravilo' },
  { type: 'vrijeme', key: 'report.type.time', testID: 'chip-report-vrijeme' },
  { type: 'recept', key: 'report.type.recipe', testID: 'chip-report-recept' },
  { type: 'drugo', key: 'report.type.other', testID: 'chip-report-drugo' },
];

export const MIN_LENGTH = 3;
export const MAX_LENGTH = 1000;
const MAX_CONTEXT = 200;

export const canSend = (type: ReportType | null, text: string): boolean =>
  type !== null && text.trim().length >= MIN_LENGTH;

/** The date param when it is a real calendar date, otherwise null. */
export const validDay = (date?: string): string | null => (date && parseIsoDate(date) !== null ? date : null);

export function buildReport(args: {
  type: ReportType;
  text: string;
  date?: string;
  context?: string;
  appVersion: string;
}): ReportInput {
  const context = args.context?.trim().slice(0, MAX_CONTEXT) ?? '';
  return {
    type: args.type,
    day: validDay(args.date),
    context: context === '' ? null : context,
    message: args.text.trim(),
    rule_pack_version: RULE_PACK_VERSION,
    app_version: args.appVersion,
  };
}
