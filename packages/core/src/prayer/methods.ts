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

/** Twilight angles stated by IZ CG on monteislam.com/vaktija: 19.5° for zora, 17.5° for jacija, standard ikindija. */
export const IZCG_ANGLES = { fajr: 19.5, isha: 17.5 } as const;

/**
 * Minute offsets of the "izcg" method on top of IZCG_ANGLES (D-13). Calibrated 2026-11-23 against the official
 * IZ CG vaktija for Podgorica, November 2026 (docs/reference/sources/monteislam-vaktija-podgorica-2026-11-23.md):
 * with these, all 30 days x 6 times match within 1 minute. Sunrise -8 and maghrib +8 are IZ CG's safety minutes.
 */
export const IZCG_OFFSETS: Readonly<MinuteOffsets> = { fajr: 1, sunrise: -8, dhuhr: 1, asr: 1, maghrib: 8, isha: 2 };

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
    case 'izcg':
      p = CalculationMethod.Other();
      p.fajrAngle = IZCG_ANGLES.fajr;
      p.ishaAngle = IZCG_ANGLES.isha;
      p.methodAdjustments = { ...IZCG_OFFSETS };
      break;
    case 'mwl':
    default:
      p = CalculationMethod.MuslimWorldLeague();
      p.methodAdjustments = { ...p.methodAdjustments, dhuhr: 0 };
      break;
  }
  p.madhab = Madhab.Shafi;
  return p;
}
