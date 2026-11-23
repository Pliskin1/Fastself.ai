import { isSummerTime } from '../calendar/tz';
import type { DayNum, SunPosition } from '../types';

const RAD = Math.PI / 180;

/**
 * Sun altitude in degrees for a Podgorica local day and minutes from local midnight.
 * Low-precision solar formula (matches the prototype engine, about 0.3 degrees).
 */
export function sunAltitude(n: DayNum, minutes: number, lat: number, lng: number): SunPosition {
  const hLocal = minutes / 60;
  const tz = isSummerTime(n) ? 2 : 1;
  const jd = 2440587.5 + n + (hLocal - tz) / 24;
  const D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(g * RAD) + 0.02 * Math.sin(2 * g * RAD)) % 360;
  const e = 23.439 - 0.00000036 * D;
  let ra = Math.atan2(Math.cos(e * RAD) * Math.sin(L * RAD), Math.cos(L * RAD)) / RAD / 15;
  ra = ((ra % 24) + 24) % 24;
  const decl = Math.asin(Math.sin(e * RAD) * Math.sin(L * RAD));
  let eqt = q / 15 - ra;
  eqt = ((((eqt + 12) % 24) + 24) % 24) - 12;
  const solar = hLocal - tz + lng / 15 + eqt;
  const H = (solar - 12) * 15 * RAD;
  const la = lat * RAD;
  const alt = Math.asin(Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(H)) / RAD;
  return { alt, morning: ((solar % 24) + 24) % 24 < 12 };
}
