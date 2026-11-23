// Prints the day plan for a date range: pnpm --filter @fastself/core run print-days 2026-12-01 2026-12-31 [orthodox,ramadan,nafila,ifOn]
import { DEFAULT_SETTINGS, dayPlan, formatHm, isoDate, parseIsoDate } from '../src/index';

const [from, to, flags = 'orthodox'] = process.argv.slice(2);
const a = from ? parseIsoDate(from) : null;
const b = to ? parseIsoDate(to) : null;
if (a === null || b === null) {
  console.error('Usage: print-days YYYY-MM-DD YYYY-MM-DD [orthodox,ramadan,nafila,ifOn]');
  process.exit(1);
}
const on = new Set(flags.split(','));
const settings = {
  ...DEFAULT_SETTINGS,
  practices: { orthodox: on.has('orthodox'), ramadan: on.has('ramadan'), nafila: on.has('nafila'), ifOn: on.has('ifOn') },
};
for (let n = a; n <= b; n++) {
  const p = dayPlan(n, settings);
  const w = p.window ? ` | ${formatHm(p.window.start)}-${formatHm(p.window.end)} ${p.window.kind}` : '';
  console.log(`${isoDate(n)} ${p.level.padEnd(7)} ${p.title} | ${p.sub}${w}`);
}
