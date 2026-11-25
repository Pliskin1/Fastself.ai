import { handleHealth } from './handler.ts';

Deno.serve((req) => handleHealth(req));
