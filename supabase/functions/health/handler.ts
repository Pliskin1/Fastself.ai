import { errors, json } from '../_shared/json.ts';

export function handleHealth(req: Request, now: () => Date = () => new Date()): Response {
  if (req.method !== 'GET') return errors.methodNotAllowed();
  return json(200, { ok: true, time: now().toISOString() });
}
