// The mobile app is native and sends no Origin, so no function needs CORS today.
// Use these only for a function that a browser must call (none yet): add the headers to its responses
// and answer `OPTIONS` with `preflight()`.
export const corsHeaders: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
};

export function preflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}
