import { z } from 'zod';
import pack from '../../rule-packs/islamic.v0.1.json';

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const IslamicPackSchema = z.strictObject({
  $comment: z.string(),
  id: z.string(),
  version: z.string(),
  authority: z.string(),
  sources: z.record(
    z.string(),
    z.strictObject({ title: z.string(), url: z.string(), retrieved: z.string(), copy: z.string() }),
  ),
  monthStarts: z
    .array(
      z.strictObject({
        hijri: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
        start: IsoDate,
        src: z.string(),
        from: z.string(),
      }),
    )
    .min(1),
});

export type IslamicPack = z.infer<typeof IslamicPackSchema>;

let cached: IslamicPack | null = null;

/** Parses the bundled Islamic calendar data once, on first use. */
export function getIslamicPack(): IslamicPack {
  cached ??= IslamicPackSchema.parse(pack);
  return cached;
}

export const ISLAMIC_PACK_VERSION: string = pack.version;
