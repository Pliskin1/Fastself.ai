import {
  WEEKDAYS_SHORT,
  forbiddenFor,
  formatHm,
  isoDate,
  nextSlava,
  parseIsoDate,
  pl,
  shortDate,
  type Category,
  type DayNum,
  type DayPlan,
  type PlanDay,
  type RangeStats,
  type Recipe,
  type Settings,
} from '@fastself/core';
import { t } from '@/copy/sr';
import type { MealPlanData, MealPlanInput, PlanMealId } from '@/lib/api';
import { color, level as levels, type LevelKey } from '@/theme/tokens';

export type RangeDays = 7 | 30;

// ---- Summary card ----

export interface SummaryItem {
  key: string;
  n: number;
  color: string;
  /** "3 dana voda". The count is the first characters, so the card can set it in bold. */
  text: string;
}

const FAST_LEVELS = ['voda', 'ulje', 'riba', 'bezmesa'] as const satisfies readonly LevelKey[];
const LEVEL_WORD: Record<(typeof FAST_LEVELS)[number], string> = {
  voda: 'day.word.voda',
  ulje: 'day.word.ulje',
  riba: 'day.word.riba',
  bezmesa: 'day.word.bezMesa',
};
const DAN: [string, string, string] = ['dan', 'dana', 'dana'];

/** Segments and stat items in the order voda, ulje, riba, bez mesa, ramazan, bez posta. Zero counts are left out. */
export function summaryItems(stats: RangeStats): SummaryItem[] {
  const entries: { key: string; n: number; color: string; label: string }[] = [
    ...FAST_LEVELS.map((key) => ({
      key,
      n: stats[key],
      color: levels[key].hex,
      label: t(LEVEL_WORD[key]),
    })),
    { key: 'ramadan', n: stats.ramadan, color: color.sun, label: t('plan.stat.ramadan') },
    { key: 'free', n: stats.free, color: levels.mrsno.hex, label: t('plan.stat.free') },
  ];
  return entries
    .filter((e) => e.n > 0)
    .map((e) => ({
      key: e.key,
      n: e.n,
      color: e.color,
      text: t('plan.stat', { n: e.n, word: pl(e.n, DAN), label: e.label }),
    }));
}

// ---- Timeline ----

export interface MealItem {
  meal: PlanMealId;
  recipe: Recipe;
}
export interface StoredDay {
  /** YYYY-MM-DD. */
  date: string;
  items: MealItem[];
}

export type PillTone = 'level' | 'ramadan' | 'neutral';

export interface RowModel {
  n: DayNum;
  weekday: string;
  date: string;
  isToday: boolean;
  tone: PillTone;
  level: LevelKey | null;
  title: string;
  line: string | null;
  meals: string[];
  nodeColor: string;
  /** One sentence for screen readers. */
  label: string;
}

const LEVEL_TITLE_KEY: Record<LevelKey, string> = {
  voda: 'day.level.voda',
  ulje: 'day.level.ulje',
  riba: 'day.level.riba',
  bezmesa: 'day.level.bezMesa',
  mrsno: 'day.level.mrsno',
};

/** The Orthodox level to show, or null for exception days and days that are not an Orthodox fast. */
function fastLevel(plan: DayPlan): LevelKey | null {
  return plan.orthFast && !plan.exception && plan.level !== 'mrsno' ? plan.level : null;
}

function infoLine(plan: DayPlan, slavaName: string | null): string | null {
  const parts: string[] = [];
  if (plan.ramadanDay > 0 && plan.times) {
    parts.push(t('plan.line.ramadan', { fajr: formatHm(plan.times.fajr), maghrib: formatHm(plan.times.maghrib) }));
  } else if (plan.nafila) {
    parts.push(t('plan.line.nafila', { name: plan.nafila.toLowerCase() }));
  }
  const w = plan.window;
  if (w?.kind === 'if') {
    parts.push(t('plan.line.if', { from: formatHm(w.start), to: formatHm(w.end) }));
  } else if (w?.ifInside) {
    parts.push(t('plan.line.ifInside', { from: formatHm(w.start), to: formatHm(w.end) }));
  }
  if (slavaName) parts.push(t('plan.line.slava', { name: slavaName }));
  return parts.length > 0 ? parts.join('. ') : null;
}

export function mealLine(item: MealItem): string {
  return t('plan.meal.line', { meal: t(`plan.meal.name.${item.meal}`), title: item.recipe.title });
}

/** One row per day. `mealsByDate` is keyed by YYYY-MM-DD. The first row is today and says "Danas". */
export function rowModels(
  plans: readonly DayPlan[],
  settings: Settings,
  mealsByDate: Readonly<Record<string, MealItem[]>> = {},
): RowModel[] {
  // Core decides when the slava is. A range is at most 30 days, so only its next occurrence can fall inside.
  const first = plans[0];
  const slava = first && settings.practices.orthodox ? nextSlava(first.n, settings.slavaId, settings) : null;
  return plans.map((plan, index) => {
    const lvl = fastLevel(plan);
    const tone: PillTone = lvl ? 'level' : plan.ramadanDay > 0 && !plan.exception ? 'ramadan' : 'neutral';
    const title = lvl ? t(LEVEL_TITLE_KEY[lvl]) : plan.title;
    const line = infoLine(plan, slava?.n === plan.n ? slava.name : null);
    const meals = (mealsByDate[isoDate(plan.n)] ?? []).map(mealLine);
    const weekday = index === 0 ? t('common.today') : WEEKDAYS_SHORT[plan.date.wd]!;
    const date = shortDate(plan.n);
    const nodeColor = lvl ? levels[lvl].hex : tone === 'ramadan' ? color.sun : levels.mrsno.hex;
    return {
      n: plan.n,
      weekday,
      date,
      isToday: index === 0,
      tone,
      level: lvl,
      title,
      line,
      meals,
      nodeColor,
      label: [`${weekday} ${date}`, title, line, ...meals].filter(Boolean).join('. '),
    };
  });
}

// ---- Meal plan ----

/** The meals asked for a day: sehur and iftar on a Ramadan day, else lunch and dinner. */
export function mealsFor(plan: DayPlan): PlanMealId[] {
  return plan.ramadanDay > 0 && !plan.exception ? ['sehur', 'iftar'] : ['rucak', 'vecera'];
}

/**
 * The only thing the AI gets (CLAUDE.md rule 3): per day the date, the forbidden categories and the meals, plus the
 * custom avoid words. No practice names, religion, location or ids.
 */
export function buildMealPlanInput(plans: readonly DayPlan[], settings: Settings): MealPlanInput {
  return {
    days: plans.map((plan) => ({
      date: isoDate(plan.n),
      forbidden: Object.keys(forbiddenFor(plan, settings)) as Category[],
      meals: mealsFor(plan),
    })),
    avoid: [...settings.customAvoid],
  };
}

/** Keeps only the recipes that pass `validate` for their day (CLAUDE.md rule 4). Days keep their order. */
export function keepValidRecipes(
  data: MealPlanData,
  plans: readonly DayPlan[],
  settings: Settings,
  validate: (recipe: Recipe, forbidden: ReturnType<typeof forbiddenFor>, avoid: readonly string[]) => string[],
): StoredDay[] {
  const byDate = new Map(plans.map((p) => [isoDate(p.n), p]));
  const days: StoredDay[] = [];
  for (const day of data.days) {
    const plan = byDate.get(day.date);
    if (!plan) continue;
    const forbidden = forbiddenFor(plan, settings);
    days.push({
      date: day.date,
      items: day.items.filter((item) => validate(item.recipe, forbidden, settings.customAvoid).length === 0),
    });
  }
  return days;
}

/** A stored plan counts while its last day is today or later. */
export function planIsCurrent(days: readonly StoredDay[], today: DayNum): boolean {
  const last = days[days.length - 1];
  if (!last) return false;
  const n = parseIsoDate(last.date);
  return n !== null && n >= today;
}

export function mealsByDate(days: readonly StoredDay[]): Record<string, MealItem[]> {
  return Object.fromEntries(days.map((d) => [d.date, d.items]));
}

/** For core `shoppingList`. Days with an unreadable date are skipped. */
export function toPlanDays(days: readonly StoredDay[]): PlanDay[] {
  const out: PlanDay[] = [];
  for (const day of days) {
    const n = parseIsoDate(day.date);
    if (n !== null) out.push({ n, meals: day.items });
  }
  return out;
}

export function capitalFirst(text: string): string {
  return text.charAt(0).toLocaleUpperCase('sr-Latn') + text.slice(1);
}

const OBROK: [string, string, string] = ['obrok', 'obroka', 'obroka'];

export function shoppingCount(count: number): string | null {
  return count > 1 ? t('plan.shopping.count', { n: count, word: pl(count, OBROK) }) : null;
}
