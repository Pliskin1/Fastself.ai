import { getProvider } from '../_shared/ai.ts';
import { createDefaultLimiter } from '../_shared/defaultLimiter.ts';
import { createHandler } from './handler.ts';

const env = (name: string) => Deno.env.get(name);

Deno.serve(
  createHandler({
    provider: getProvider(env),
    providerName: (env('AI_PROVIDER') ?? 'anthropic').toLowerCase(),
    limiter: createDefaultLimiter(),
  }),
);
