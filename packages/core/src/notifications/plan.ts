import { formatHm } from '../calendar/format';
import { epochFromLocal, localFromEpoch } from '../calendar/tz';
import { FORBID, CATEGORY_LABEL } from '../meals/data';
import { dayPlan } from '../plan/dayPlan';
import { LEVEL_TITLE } from '../rules/levels';
import type { Category, DayNum, IfPlan, PlannedNotification, ReminderKind, Reminders, Settings } from '../types';

/** Every reminder is on until the user turns it off in Profil. */
export const DEFAULT_REMINDERS: Reminders = {
  evening: true,
  ramadan: true,
  window: true,
  ifEnd: true,
};
/** iOS keeps at most 64 pending notifications; the planner leaves room for the IF timer. */
export const MAX_PLANNED = 60;

/** Plate categories in the order of the "Danas na tanjiru" card. */
export const PLATE: readonly Category[] = [
  'povrce',
  'voce',
  'mahunarke',
  'zitarice',
  'orasasto',
  'ulje',
  'riba',
  'mlijecno',
  'jaja',
  'meso',
  'med',
  'vino',
];

/** Reads stored reminder switches. Never throws: anything missing or not a boolean counts as on. */
export function parseReminders(value: unknown): Reminders {
  const o = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const b = (k: keyof Reminders): boolean => (typeof o[k] === 'boolean' ? o[k] : true);
  return { evening: b('evening'), ramadan: b('ramadan'), window: b('window'), ifEnd: b('ifEnd') };
}

const labels = (cats: readonly Category[]) => cats.map((c) => CATEGORY_LABEL[c].toLowerCase()).join(', ');

/**
 * The local reminders of the next 7 days (DATABASE section 5), earliest first, only those after `now`:
 * - evening: at 20:00 before an Orthodox fast day, or before a suggested voluntary fast the user has not chosen yet;
 * - ramadan: sehur 30 minutes before fajr and iftar at maghrib, on Ramadan days without an exception;
 * - window: the eating window opening and 30 minutes before it closes, when IF is on. On a Ramadan day the opening
 *   is left out because iftar fires in the same minute.
 * The end of an IF fast is scheduled by the timer, not here. Each item carries the values for its copy template.
 */
export function planNotifications(today: DayNum, s: Settings, now: number, r: Reminders): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  const push = (kind: ReminderKind, n: DayNum, minutes: number, params: Record<string, string>) => {
    out.push({ id: `plan:${kind}:${n}`, at: epochFromLocal(n, minutes), kind, n, params });
  };

  for (let d = today; d < today + 7; d++) {
    const plan = dayPlan(d, s);
    const next = dayPlan(d + 1, s);

    if (r.evening) {
      if (next.orthFast) {
        const forb = FORBID[next.level];
        push('eve', d, 20 * 60, {
          title: LEVEL_TITLE[next.level].toLowerCase(),
          allowed: labels(PLATE.filter((c) => !forb.includes(c))),
          forbidden: labels(PLATE.filter((c) => forb.includes(c))),
        });
      } else if (next.nafila !== null && !next.nafilaFast) {
        push('nafila', d, 20 * 60, { reason: next.nafila });
      }
    }

    let iftarAt: number | null = null;
    if (r.ramadan && plan.ramadanDay > 0 && plan.exception === null && plan.times) {
      push('sehur', d, plan.times.fajr - 30, { fajr: formatHm(plan.times.fajr) });
      push('iftar', d, plan.times.maghrib, { time: formatHm(plan.times.maghrib) });
      iftarAt = epochFromLocal(d, plan.times.maghrib);
    }

    if (r.window && plan.ifHours > 0 && plan.window) {
      const to = formatHm(plan.window.end);
      if (iftarAt === null || epochFromLocal(d, plan.window.start) !== iftarAt) {
        push('windowOpen', d, plan.window.start, { to });
      }
      push('windowClose', d, plan.window.end - 30, { to });
    }
  }

  return out
    .filter((x) => x.at > now)
    .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, MAX_PLANNED);
}

/** Copy values of the "fast is over" notification: the hours fasted and when the eating window that opens now ends. */
export function ifEndParams(endsAtMs: number, hours: IfPlan): { h: string; to: string } {
  return {
    h: String(hours),
    to: formatHm(localFromEpoch(endsAtMs).minutes + (24 - hours) * 60),
  };
}
