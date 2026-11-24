// Golden data: TESTING.md 3.4 Hijri (Diyanet month starts, tabular outside them).
// Rows: [gregorian ISO, hijri y, m, d, shift]. Data only.
export const HIJRI_GOLDEN: readonly (readonly [string, number, number, number, number])[] = [
  ['2025-03-01', 1446, 9, 1, 0],
  ['2026-02-18', 1447, 9, 1, 0],
  ['2027-02-08', 1448, 9, 1, 0],
  ['2028-01-27', 1449, 9, 1, 0], // extrapolated: tabular shifted by the last known month start
  ['2027-03-09', 1448, 10, 1, 0],
  ['2027-05-15', 1448, 12, 9, 0],
  ['2026-06-26', 1448, 1, 10, 0],
  ['2026-12-02', 1448, 6, 23, 0],
  ['2027-02-07', 1448, 8, 30, 0],
  ['2027-02-09', 1448, 9, 1, 1],
];

/** Plain tabular results (tabularHijri, shift 0), unchanged by the Diyanet data. */
export const HIJRI_TABULAR_GOLDEN: readonly (readonly [string, number, number, number])[] = [
  ['2025-03-01', 1446, 9, 1],
  ['2026-02-18', 1447, 9, 1],
  ['2027-02-08', 1448, 9, 1],
  ['2028-01-28', 1449, 9, 1],
  ['2027-03-10', 1448, 10, 1],
  ['2027-05-16', 1448, 12, 9],
  ['2026-12-02', 1448, 6, 21],
  ['2027-02-07', 1448, 8, 29],
];
