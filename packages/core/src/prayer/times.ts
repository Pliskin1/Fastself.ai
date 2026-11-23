import { Coordinates, PrayerTimes as AdhanTimes } from 'adhan';
import { fromDayNum } from '../calendar/daynum';
import { localFromEpoch } from '../calendar/tz';
import type { CityId, DayNum, PrayerMethod, PrayerTimes } from '../types';
import { CITIES } from './cities';
import { methodParams } from './methods';

/** Prayer times in integer minutes from Podgorica local midnight of day n. User offsets are added last. */
export function prayerTimes(
  n: DayNum,
  city: CityId,
  method: PrayerMethod,
  offsets: { fajr: number; maghrib: number } = { fajr: 0, maghrib: 0 },
): PrayerTimes {
  const c = CITIES[city];
  const { y, m, d } = fromDayNum(n);
  // adhan reads the day from host-local getters, so pass a Date built from local parts.
  const t = new AdhanTimes(new Coordinates(c.lat, c.lng), new Date(y, m - 1, d), methodParams(method));
  const mins = (date: Date): number => {
    const l = localFromEpoch(date.getTime());
    return (l.n - n) * 1440 + l.minutes;
  };
  return {
    fajr: mins(t.fajr) + offsets.fajr,
    sunrise: mins(t.sunrise),
    dhuhr: mins(t.dhuhr),
    asr: mins(t.asr),
    maghrib: mins(t.maghrib) + offsets.maghrib,
    isha: mins(t.isha),
  };
}
