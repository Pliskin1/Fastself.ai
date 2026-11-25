import { pl, prayerTimes, formatHm, type DayNum, type Settings } from '@fastself/core';
import { t } from '@/copy/sr';
import { allergyCount } from '@/features/onboarding';

export const OFFSET_LIMIT = 15;

export type OffsetKey = 'fajr' | 'maghrib';

export function practiceSummary(settings: Settings): string {
  const p = settings.practices;
  const out: string[] = [];
  if (p.orthodox) out.push(t('prakse.orthodox.title'));
  if (p.ramadan) out.push(t('prakse.ramadan.title'));
  if (p.nafila) out.push(t('prakse.nafila.title'));
  if (p.ifOn && !settings.minor) out.push(t('day.if', { plan: t(`prakse.if.${settings.ifPlan}`) }));
  return out.length ? out.join(', ') : t('day.noPractices');
}

export function allergySummary(settings: Settings): string {
  const n = allergyCount(settings);
  return t('alergije.count', { n, word: pl(n, ['namirnica', 'namirnice', 'namirnica']) });
}

/** Moves a prayer offset by `delta` minutes, never beyond ±OFFSET_LIMIT. */
export function stepOffset(offsets: Settings['offsets'], key: OffsetKey, delta: number): Settings['offsets'] {
  const next = Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, offsets[key] + delta));
  return { ...offsets, [key]: next };
}

/** Moves the Ramadan start by one day, never beyond ±1. */
export const stepShift = (shift: Settings['ramadanShift'], delta: number): Settings['ramadanShift'] =>
  Math.max(-1, Math.min(1, shift + delta)) as Settings['ramadanShift'];

export const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

/** Zora and akšam of a day with the user's method and offsets, as "HH:MM". */
export function zoraAksam(n: DayNum, settings: Settings): { fajr: string; maghrib: string } {
  const times = prayerTimes(n, settings.city, settings.prayerMethod, settings.offsets);
  return { fajr: formatHm(times.fajr), maghrib: formatHm(times.maghrib) };
}
