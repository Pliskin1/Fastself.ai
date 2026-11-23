import { fromDayNum } from '../calendar/daynum';
import { formatHm } from '../calendar/format';
import { hijriDate } from '../calendar/hijriDate';
import { prayerTimes } from '../prayer/times';
import { LEVEL_TITLE } from '../rules/levels';
import { nafilaSuggestion, ramadanMonth } from '../rules/islamic';
import { orthodoxRule } from '../rules/orthodox';
import type { DayNum, DayPlan, Headline, IfPlan, Settings } from '../types';
import { eatingWindow } from './window';

const IF_LABEL: Record<IfPlan, string> = { 12: '12:12', 14: '14:10', 16: '16:8' };

/** The full plan of one day (DOMAIN section 7): rule, Ramadan, nafila, prayer times, eating window, title. */
export function dayPlan(n: DayNum, s: Settings): DayPlan {
  const P = s.practices;
  const date = fromDayNum(n);
  const orth = P.orthodox ? orthodoxRule(n, s) : null;
  const ruleLevel = orth?.level ?? 'mrsno';
  const orthFast = !!orth && ruleLevel !== 'mrsno';
  const hijri = hijriDate(n, s.ramadanShift);
  const ramadan = P.ramadan ? ramadanMonth(n, s) : null;
  const ram = ramadan ? ramadan.day : 0;
  const naf = P.nafila && !ram ? nafilaSuggestion(n, hijri) : null;
  const nafFast = !!naf && !!s.nafilaDays[n];
  const times = P.ramadan || P.nafila ? prayerTimes(n, s.city, s.prayerMethod, s.offsets) : null;
  const ifH: 0 | IfPlan = P.ifOn && !s.minor ? s.ifPlan : 0;
  const exception = s.exceptions[n] ?? null;

  if (exception) {
    return {
      n,
      date,
      level: 'mrsno',
      ruleLevel,
      orthodox: orth,
      orthFast: false,
      hijri,
      ramadanDay: ram,
      ramadan,
      nafila: null,
      nafilaFast: false,
      times,
      window: null,
      ifHours: 0,
      headline: 'exception',
      title: 'Danas ne postiš',
      sub: ram ? `${ram}. ramazan, dan za naknadu` : `Izuzetak: ${exception}`,
      exception,
      kaza: ram > 0,
    };
  }

  const window = eatingWindow({ ramadan: ram > 0, nafilaFast: nafFast, times, ifHours: ifH });
  let headline: Headline;
  let title: string;
  let sub: string;
  const first = orth?.reasons[0];
  if (orthFast && orth) {
    headline = 'orthodox';
    title = LEVEL_TITLE[ruleLevel];
    sub = orth.period
      ? `${orth.period.name}, ${orth.period.index}. dan od ${orth.period.length}`
      : orth.reasons[0]!.label;
    if (ram) sub += `, i ${ram}. ramazan`;
  } else if (ram) {
    headline = 'ramadan';
    title = `${ram}. ramazan`;
    sub = `Post od zore do akšama, ${hijri.y}. po Hidžri`;
  } else if (nafFast) {
    headline = 'nafila';
    title = 'Dobrovoljni post';
    sub = naf!;
  } else if (first && first.label !== 'Običan dan') {
    headline = 'free';
    title = 'Mrsno';
    sub = `${first.label}, ${first.sub}`;
  } else if (ifH && window) {
    headline = 'if';
    title = `IF ${IF_LABEL[ifH]}`;
    sub = `Prozor za jelo ${formatHm(window.start)}–${formatHm(window.end)}`;
  } else {
    headline = 'none';
    title = 'Danas nema posta';
    sub = naf
      ? `Dobrovoljni post je moguć: ${naf.charAt(0).toLowerCase()}${naf.slice(1)}`
      : 'Nijedno tvoje pravilo ne važi za ovaj dan';
  }

  return {
    n,
    date,
    level: ruleLevel,
    ruleLevel,
    orthodox: orth,
    orthFast,
    hijri,
    ramadanDay: ram,
    ramadan,
    nafila: naf,
    nafilaFast: nafFast,
    times,
    window,
    ifHours: ifH,
    headline,
    title,
    sub,
    exception: null,
    kaza: false,
  };
}
