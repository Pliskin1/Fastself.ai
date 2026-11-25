import { handleHealth } from './handler.ts';

Deno.test('health returns ok and the time', async () => {
  const res = handleHealth(new Request('http://local/health'), () => new Date('2026-11-25T10:00:00Z'));
  if (res.status !== 200) throw new Error(`status ${res.status}`);
  const data = await res.json();
  if (data.ok !== true || data.time !== '2026-11-25T10:00:00.000Z') throw new Error(JSON.stringify(data));
});

Deno.test('health rejects other methods', async () => {
  const res = handleHealth(new Request('http://local/health', { method: 'POST' }));
  if (res.status !== 405) throw new Error(`status ${res.status}`);
  await res.body?.cancel();
});
