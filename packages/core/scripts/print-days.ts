// Prints the day plan for a date range: pnpm --filter @fastself/core run print-days 2026-12-01 2026-12-31
// dayPlan lands with T2; until then this only validates the arguments.
const [from, to] = process.argv.slice(2);
if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
  console.error('Usage: print-days YYYY-MM-DD YYYY-MM-DD');
  process.exit(1);
}
console.log(`print-days ${from}..${to}: dayPlan is not ported yet (T2).`);
