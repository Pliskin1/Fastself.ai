import { z } from 'zod';
import type { Settings } from './types';

const AllergenSchema = z.enum([
  'gluten',
  'mlijecno',
  'jaja',
  'riba',
  'rakovi',
  'mekusci',
  'kikiriki',
  'orasasto',
  'soja',
  'susam',
  'celer',
  'senf',
  'sulfiti',
  'lupina',
]);
const CitySchema = z.enum([
  'podgorica',
  'niksic',
  'bar',
  'ulcinj',
  'bijelo-polje',
  'rozaje',
  'pljevlja',
  'berane',
  'plav',
  'herceg-novi',
  'cetinje',
]);
const SlavaSchema = z.enum([
  'nikola',
  'jovan',
  'djurdjevdan',
  'vasilije',
  'arandjel',
  'mitrovdan',
  'lucindan',
  'petrovdan',
  'ilindan',
  'stefan',
]);
const dayKey = z.string().regex(/^-?\d+$/);

export const SettingsSchema = z.object({
  practices: z.object({ orthodox: z.boolean(), ramadan: z.boolean(), nafila: z.boolean(), ifOn: z.boolean() }),
  ifPlan: z.union([z.literal(12), z.literal(14), z.literal(16)]),
  strictness: z.enum(['voda', 'ulje', 'riba']),
  slavaId: SlavaSchema.nullable(),
  allergies: z.array(AllergenSchema),
  customAvoid: z.array(z.string()),
  diets: z.object({ vegetarian: z.boolean(), vegan: z.boolean(), halal: z.boolean() }),
  minor: z.boolean(),
  city: CitySchema,
  prayerMethod: z.enum(['izcg', 'mwl', 'turkey', 'ummalqura']),
  offsets: z.object({ fajr: z.number(), maghrib: z.number() }),
  ramadanShift: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  exceptions: z.record(dayKey, z.enum(['zdravlje', 'putovanje', 'drugo'])),
  nafilaDays: z.record(dayKey, z.literal(true)),
});

export const DEFAULT_SETTINGS: Settings = {
  practices: { orthodox: false, ramadan: false, nafila: false, ifOn: false },
  ifPlan: 16,
  strictness: 'voda',
  slavaId: null,
  allergies: [],
  customAvoid: [],
  diets: { vegetarian: false, vegan: false, halal: false },
  minor: false,
  city: 'podgorica',
  prayerMethod: 'izcg',
  offsets: { fajr: 0, maghrib: 0 },
  ramadanShift: 0,
  exceptions: {},
  nafilaDays: {},
};

/** Validates stored settings JSON. Missing top-level keys fall back to DEFAULT_SETTINGS; invalid values throw. */
export function parseSettings(json: unknown): Settings {
  const base = typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {};
  return SettingsSchema.parse({ ...DEFAULT_SETTINGS, ...base }) as Settings;
}
