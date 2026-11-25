/** JSON response helper. Errors are `{ error: <code> }` only, never details. */
export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export const errors = {
  invalidInput: () => json(400, { error: 'invalid_input' }),
  methodNotAllowed: () => json(405, { error: 'method_not_allowed' }),
  rateLimited: () => json(429, { error: 'rate_limited' }),
  server: () => json(500, { error: 'server' }),
};
