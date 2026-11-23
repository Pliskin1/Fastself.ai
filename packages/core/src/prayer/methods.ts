import { CalculationMethod, Madhab } from 'adhan';
import type { CalculationParameters } from 'adhan';
import type { PrayerMethod } from '../types';

export type MinuteOffsets = {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
};

/**
 * Minute offsets of the "izcg" method on top of Muslim World League.
 * UNCALIBRATED: all zero until D-13 is closed (official IZ CG vaktija values are not in docs/reference/sources yet).
 */
export const IZCG_OFFSETS: Readonly<MinuteOffsets> = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };

/** adhan parameters for a method (Shafi asr). */
export function methodParams(method: PrayerMethod): CalculationParameters {
  let p: CalculationParameters;
  switch (method) {
    case 'turkey':
      p = CalculationMethod.Turkey();
      break;
    case 'ummalqura':
      p = CalculationMethod.UmmAlQura();
      break;
    case 'mwl':
    case 'izcg':
    default:
      p = CalculationMethod.MuslimWorldLeague();
      p.methodAdjustments = { ...p.methodAdjustments, dhuhr: 0 };
      if (method === 'izcg') p.methodAdjustments = { ...p.methodAdjustments, ...IZCG_OFFSETS };
      break;
  }
  p.madhab = Madhab.Shafi;
  return p;
}
