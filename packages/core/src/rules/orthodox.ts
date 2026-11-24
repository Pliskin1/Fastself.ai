import { fromDayNum, toDayNum } from '../calendar/daynum';
import { orthodoxEaster } from '../calendar/easter';
import type { DayNum, FoodLevel, OrthodoxResult, Period, Reason, Settings } from '../types';
import { LEVEL_RANK, LEVEL_SHORT, capLevel, stricter } from './levels';
import { getRulePack } from './rulePack';

type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
const WD: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface Selector {
  fixed?: string | [string, string];
  easter?: number | [number, number];
  easterFrom?: number;
  fixedTo?: string;
}

interface Ctx {
  n: DayNum;
  y: number;
  easter: DayNum;
}

const md = (s: string): [number, number] => [Number(s.slice(0, 2)), Number(s.slice(3))];

/** The inclusive DayNum span of the selector that contains n, or null. */
function span(sel: Selector, c: Ctx): { start: DayNum; end: DayNum } | null {
  const { n, y, easter } = c;
  if (sel.fixed !== undefined) {
    if (typeof sel.fixed === 'string') {
      const [m, d] = md(sel.fixed);
      const t = toDayNum(y, m, d);
      return t === n ? { start: t, end: t } : null;
    }
    const [from, to] = sel.fixed;
    const wraps = to < from;
    for (const sy of [y - 1, y]) {
      const [fm, fd] = md(from);
      const [tm, td] = md(to);
      const start = toDayNum(sy, fm, fd);
      const end = toDayNum(wraps ? sy + 1 : sy, tm, td);
      if (n >= start && n <= end) return { start, end };
    }
    return null;
  }
  if (sel.easter !== undefined) {
    const [a, b] = typeof sel.easter === 'number' ? [sel.easter, sel.easter] : sel.easter;
    return n >= easter + a && n <= easter + b ? { start: easter + a, end: easter + b } : null;
  }
  if (sel.easterFrom !== undefined && sel.fixedTo !== undefined) {
    const [m, d] = md(sel.fixedTo);
    const start = easter + sel.easterFrom;
    const end = toDayNum(y, m, d);
    return n >= start && n <= end ? { start, end } : null;
  }
  return null;
}

const progress = (id: string, name: string, s: { start: DayNum; end: DayNum }, n: DayNum): Period => ({
  id,
  name,
  index: n - s.start + 1,
  length: s.end - s.start + 1,
});

/**
 * Orthodox fasting rule for a day (rule pack v0.1, DOMAIN section 2).
 * Order: free -> periods + one-day + weekly (strictest wins) -> relaxations -> strictness cap.
 */
export function orthodoxRule(n: DayNum, s?: Pick<Settings, 'strictness'>): OrthodoxResult {
  const pack = getRulePack();
  const { y, wd } = fromDayNum(n);
  const c: Ctx = { n, y, easter: orthodoxEaster(y) };
  const day = WD[wd]!;

  for (const f of pack.free) {
    if (span(f, c)) return { level: f.level, reasons: [{ label: f.name, sub: f.sub, level: f.level }], period: null };
  }

  const reasons: Reason[] = [];
  let level: FoodLevel | null = null;
  let period: Period | null = null;

  for (const p of pack.periods) {
    const sp = span(p, c);
    if (!sp) continue;
    let week = p.week;
    if (p.segments) week = p.segments.find((g) => span({ fixed: g.fixed }, c))?.week ?? p.week;
    if (!week) continue;
    const lv = week[day];
    reasons.push({ label: p.name, sub: p.sub, level: lv });
    level = level ? stricter(level, lv) : lv;
    period = progress(p.id, p.name, sp, n);
  }

  let oneDay = false;
  for (const o of pack.oneDay) {
    if (!span(o, c)) continue;
    oneDay = true;
    reasons.length = 0;
    reasons.push({ label: o.name, sub: o.sub, level: o.level });
    level = level ? stricter(level, o.level) : o.level;
    period = null;
    if (o.keepsPeriod) {
      const kp = pack.periods.find((p) => p.id === o.keepsPeriod);
      const sp = kp ? span(kp, c) : null;
      if (kp && sp) period = progress(kp.id, kp.name, sp, n);
    }
  }

  const w = pack.weekly;
  if (!oneDay && (day === 'wed' || day === 'fri')) {
    const ov = w.overrides.find((o) => span(o, c));
    const lv = ov ? ov.level : w.level;
    reasons.push({ label: w.days[day], sub: ov ? ov.sub : w.sub, level: lv });
    level = level ? stricter(level, lv) : lv;
  }

  if (level && LEVEL_RANK[level] > LEVEL_RANK.riba) {
    for (const r of pack.relax) {
      if (!span(r, c)) continue;
      reasons.push({ label: r.name, sub: pack.relaxSub, level: r.to });
      level = r.to;
      break;
    }
  }

  if (!level) {
    return { level: 'mrsno', reasons: [{ label: 'Običan dan', sub: 'nema posta', level: 'mrsno' }], period: null };
  }

  const strictness = s?.strictness ?? 'voda';
  const capped = capLevel(level, strictness);
  if (capped !== level) {
    reasons.push({ label: 'Tvoja mjera posta', sub: `najstrože što držiš: ${LEVEL_SHORT[capped]}`, level: capped });
    level = capped;
  }
  return { level, reasons, period };
}
