import { z } from 'zod';
import pack from '../../rule-packs/orthodox.v0.1.json';

const Level = z.enum(['voda', 'ulje', 'riba', 'bezmesa', 'mrsno']);
const Src = z.enum(['svetosavlje', 'domain']);
const MonthDay = z.string().regex(/^\d{2}-\d{2}$/);
const Fixed = z.union([MonthDay, z.tuple([MonthDay, MonthDay])]);
const Easter = z.union([z.number().int(), z.tuple([z.number().int(), z.number().int()])]);
const Os = z.union([MonthDay, z.tuple([MonthDay, MonthDay])]);
const Week = z.strictObject({
  mon: Level,
  tue: Level,
  wed: Level,
  thu: Level,
  fri: Level,
  sat: Level,
  sun: Level,
});

const Free = z.strictObject({
  id: z.string(),
  name: z.string(),
  sub: z.string(),
  level: Level,
  src: Src,
  fixed: Fixed.optional(),
  os: Os.optional(),
  easter: Easter.optional(),
});
const Segment = z.strictObject({ fixed: z.tuple([MonthDay, MonthDay]), os: Os, week: Week });
const Period = z.strictObject({
  id: z.string(),
  name: z.string(),
  sub: z.string(),
  src: Src,
  fixed: Fixed.optional(),
  os: Os.optional(),
  easter: Easter.optional(),
  easterFrom: z.number().int().optional(),
  fixedTo: MonthDay.optional(),
  osTo: MonthDay.optional(),
  week: Week.optional(),
  segments: z.array(Segment).optional(),
});
const OneDay = z.strictObject({
  id: z.string(),
  name: z.string(),
  sub: z.string(),
  level: Level,
  src: Src,
  fixed: Fixed,
  os: Os,
  keepsPeriod: z.string().optional(),
});
const Override = z.strictObject({
  id: z.string(),
  name: z.string(),
  sub: z.string(),
  level: Level,
  src: Src,
  easter: Easter,
});
const Relax = z.strictObject({
  id: z.string(),
  name: z.string(),
  to: Level,
  src: Src,
  fixed: Fixed.optional(),
  os: Os.optional(),
  easter: Easter.optional(),
});

export const RulePackSchema = z.strictObject({
  $comment: z.string(),
  id: z.string(),
  version: z.string(),
  calendar: z.literal('julian'),
  dateStyle: z.literal('gregorian'),
  julianOffsetDays: z.number().int(),
  validYears: z.tuple([z.number().int(), z.number().int()]),
  sources: z.record(
    z.string(),
    z.strictObject({
      title: z.string().optional(),
      url: z.string().optional(),
      retrieved: z.string().optional(),
      ref: z.string().optional(),
      covers: z.string(),
    }),
  ),
  free: z.array(Free),
  periods: z.array(Period),
  oneDay: z.array(OneDay),
  weekly: z.strictObject({
    days: z.strictObject({ wed: z.string(), fri: z.string() }),
    sub: z.string(),
    level: Level,
    src: Src,
    overrides: z.array(Override),
  }),
  relax: z.array(Relax),
  relaxSub: z.string(),
});

export type RulePack = z.infer<typeof RulePackSchema>;

let cached: RulePack | null = null;

/** Parses the bundled orthodox rule pack once, on first use. */
export function getRulePack(): RulePack {
  cached ??= RulePackSchema.parse(pack);
  return cached;
}

export const RULE_PACK_VERSION: string = pack.version;
