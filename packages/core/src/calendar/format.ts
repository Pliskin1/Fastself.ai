import type { DayNum } from '../types';
import { fromDayNum } from './daynum';

export const WEEKDAYS = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'] as const;
export const WEEKDAYS_SHORT = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'] as const;
export const MONTHS = [
  'Januar',
  'Februar',
  'Mart',
  'April',
  'Maj',
  'Jun',
  'Jul',
  'Avgust',
  'Septembar',
  'Oktobar',
  'Novembar',
  'Decembar',
] as const;
export const MONTHS_GEN = [
  'januar',
  'februar',
  'mart',
  'april',
  'maj',
  'jun',
  'jul',
  'avgust',
  'septembar',
  'oktobar',
  'novembar',
  'decembar',
] as const;
export const HIJRI_MONTHS = [
  'muharem',
  'safer',
  'rebiul-evvel',
  'rebiul-ahir',
  'džumadel-ula',
  'džumadel-uhra',
  'redžeb',
  'šaban',
  'ramazan',
  'ševval',
  'zul-kade',
  'zul-hidždže',
] as const;

const pad = (v: number): string => (v < 10 ? '0' : '') + v;

/** "HH:MM" of a minute count from local midnight, wrapped into one day. */
export function formatHm(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** "HH:MM" of a duration in minutes (no wrap, floored at zero). */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** "Srijeda, 2. decembar". */
export function longDate(n: DayNum): string {
  const { d, m, wd } = fromDayNum(n);
  return `${WEEKDAYS[wd]}, ${d}. ${MONTHS_GEN[m - 1]}`;
}

/** "2.12." */
export function shortDate(n: DayNum): string {
  const { d, m } = fromDayNum(n);
  return `${d}.${m}.`;
}
