import { getAdmin } from '../_shared/supabaseAdmin.ts';
import { createHandler } from './handler.ts';

Deno.serve(
  createHandler({
    env: (name) => Deno.env.get(name),
    fetch: (input, init) => fetch(input, init),
    admin: getAdmin,
  }),
);
