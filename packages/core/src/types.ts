// Public type contract of @fastself/core. Types only: no runtime code in this file.
// Spec: docs/DOMAIN.md. Dates are calendar dates in Europe/Podgorica.

// ---- Calendar ----
/** Days since 1970-01-01 of the Podgorica calendar date. */
export type DayNum = number;
/** wd: 0 = Sunday ... 6 = Saturday. m: 1..12. */
export interface LocalDate {
  y: number;
  m: number;
  d: number;
  wd: number;
}
export interface HijriDate {
  y: number;
  m: number;
  d: number;
}

// ---- Food and settings enums ----
/** Strict to free: voda > ulje > riba > bezmesa > mrsno. */
export type FoodLevel = 'voda' | 'ulje' | 'riba' | 'bezmesa' | 'mrsno';
/** "Mjera posta": the strictest level the user keeps. */
export type Strictness = 'voda' | 'ulje' | 'riba';
export interface Practices {
  orthodox: boolean;
  ramadan: boolean;
  nafila: boolean;
  ifOn: boolean;
}
export type IfPlan = 12 | 14 | 16;
export type ExceptionReason = 'zdravlje' | 'putovanje' | 'drugo';
export type PrayerMethod = 'izcg' | 'mwl' | 'turkey' | 'ummalqura';
export type AllergenId =
  | 'gluten'
  | 'mlijecno'
  | 'jaja'
  | 'riba'
  | 'rakovi'
  | 'mekusci'
  | 'kikiriki'
  | 'orasasto'
  | 'soja'
  | 'susam'
  | 'celer'
  | 'senf'
  | 'sulfiti'
  | 'lupina';
/** Stored value of Settings.city (SQLite and Postgres). Frozen. */
export type CityId =
  | 'podgorica'
  | 'niksic'
  | 'bar'
  | 'ulcinj'
  | 'bijelo-polje'
  | 'rozaje'
  | 'pljevlja'
  | 'berane'
  | 'plav'
  | 'herceg-novi'
  | 'cetinje';

export interface Settings {
  practices: Practices;
  ifPlan: IfPlan;
  strictness: Strictness;
  slavaId: SlavaId | null;
  allergies: AllergenId[];
  customAvoid: string[];
  diets: { vegetarian: boolean; vegan: boolean; halal: boolean };
  minor: boolean;
  city: CityId;
  prayerMethod: PrayerMethod;
  /** Minutes, user adjustable, added on top of the method offsets. */
  offsets: { fajr: number; maghrib: number };
  /** Shifts the Hijri calendar by days. */
  ramadanShift: -1 | 0 | 1;
  /** Local only, never leaves the device. */
  exceptions: Record<DayNum, ExceptionReason>;
  /** User chose to fast a suggested voluntary day. */
  nafilaDays: Record<DayNum, true>;
}

// ---- Meals ----
export type Category =
  | 'povrce'
  | 'voce'
  | 'mahunarke'
  | 'zitarice'
  | 'orasasto'
  | 'ulje'
  | 'riba'
  | 'mlijecno'
  | 'jaja'
  | 'meso'
  | 'vino'
  | 'gluten'
  | 'susam'
  | 'celer'
  | 'med'
  | 'rakovi'
  | 'mekusci'
  | 'kikiriki'
  | 'soja'
  | 'senf'
  | 'sulfiti'
  | 'lupina'
  | 'svinjetina'
  | 'alkohol';
export type MealId = 'dorucak' | 'rucak' | 'vecera' | 'sehur' | 'iftar';
export interface Recipe {
  id: string;
  title: string;
  timeMin: number;
  meals: MealId[];
  cats: Category[];
  ingredients: string[];
  steps: string[];
}
export type ForbiddenSource = 'pravilo' | 'dijeta' | 'alergija';
export type ForbiddenMap = Partial<Record<Category, { src: ForbiddenSource; label: string }>>;

// ---- Slava ----
export type SlavaId =
  | 'nikola'
  | 'jovan'
  | 'djurdjevdan'
  | 'vasilije'
  | 'arandjel'
  | 'mitrovdan'
  | 'lucindan'
  | 'petrovdan'
  | 'ilindan'
  | 'stefan';
export interface NextSlava {
  id: SlavaId;
  name: string;
  /** Day of the next occurrence (on or after today). */
  n: DayNum;
  daysUntil: number;
  plan: DayPlan;
  /** True when the slava falls on a fast day. */
  posna: boolean;
  level: FoodLevel;
  /** True for voda and ulje: show the "ask your priest about fish" line. */
  askPriest: boolean;
}

// ---- Orthodox ----
export interface Reason {
  label: string;
  sub: string;
  level: FoodLevel | 'vrijeme' | 'filter' | 'slava';
}
/** index: 1-based day inside the period; length: days in the period this year. */
export interface Period {
  id: string;
  name: string;
  index: number;
  length: number;
}
export interface OrthodoxResult {
  level: FoodLevel;
  reasons: Reason[];
  period: Period | null;
}

// ---- Islamic ----
export interface RamadanMonth {
  year: number;
  /** 1-based day of Ramadan for the queried day. */
  day: number;
  length: 29 | 30;
  /** First day of Ramadan. */
  start: DayNum;
  /** Evening of day 26 (night before the 27th). */
  qadr: DayNum;
  /** 1 Shawwal. */
  bajram: DayNum;
  /** Exception days inside this Ramadan (to be made up). */
  kazaCount: number;
  exceptionDays: DayNum[];
}

// ---- Prayer and windows ----
/** Integer minutes from local midnight. */
export interface PrayerTimes {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}
/** Minutes from local midnight of the plan day; end may exceed 1440. */
export interface EatWindow {
  start: number;
  end: number;
  kind: 'ramazan' | 'nafila' | 'if';
  /** True when the IF plan caps a Ramadan or nafila window. */
  ifInside: boolean;
}

// ---- Day plan ----
export type Headline = 'orthodox' | 'ramadan' | 'nafila' | 'free' | 'if' | 'none' | 'exception';
export interface DayPlan {
  n: DayNum;
  date: LocalDate;
  /** Level shown to the user (mrsno on an exception day). */
  level: FoodLevel;
  /** Level the Orthodox rule gives, ignoring exceptions. */
  ruleLevel: FoodLevel;
  orthodox: OrthodoxResult | null;
  /** True when the Orthodox rule makes this a fast day (level is not mrsno). */
  orthFast: boolean;
  hijri: HijriDate;
  /** 0 when not Ramadan (or Ramadan practice is off). */
  ramadanDay: number;
  ramadan: RamadanMonth | null;
  /** Suggested voluntary fast, for example "Ašura". */
  nafila: string | null;
  nafilaFast: boolean;
  times: PrayerTimes | null;
  window: EatWindow | null;
  /** 0 when IF is off or the user is a minor. */
  ifHours: 0 | IfPlan;
  headline: Headline;
  title: string;
  sub: string;
  exception: ExceptionReason | null;
  /** Exception day inside Ramadan: counts toward kaza. */
  kaza: boolean;
}
/** Each day counts once: its level if orthFast, else ramadan, else free. Exception days count as free. nafila is separate. */
export interface RangeStats {
  days: number;
  voda: number;
  ulje: number;
  riba: number;
  bezmesa: number;
  ramadan: number;
  free: number;
  nafila: number;
}

// ---- Sky ----
export interface MoonPhase {
  phase: number;
  illumination: number;
  name: string;
}
/** CSS rgb() strings: top, mid, bottom. */
export type SkyColors = readonly [string, string, string];
export interface SunPosition {
  alt: number;
  morning: boolean;
}
