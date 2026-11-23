# Official sources (accuracy checks)

Put scans, photos or PDFs here. Name them `<source>-<yyyy-mm-dd>.<ext>`. They are the truth for TESTING §9.

| File to add | What | Used for |
|---|---|---|
| `izcg-vaktija-podgorica-<date>.jpg` (5 dates: one in Dec, one in Feb or Mar, one in summer time, one near the DST change, one in Ramadan 2027) | Official IZ CG vaktija for Podgorica | calibrating the `izcg` minute offsets (D-13) and the golden rows |
| `crkveni-kalendar-2026-12.jpg`, `-2027-01.jpg`, `-2027-03.jpg`, `-2027-04.jpg`, `-2027-05.jpg` | Orthodox church calendar pages (Mitropolija crnogorsko-primorska) with the fasting marks | checking `orthodox.v0.1.json` day by day |
| `slave-lista.txt` | the 10 slava dates in the app, checked against the calendar | `core/slava` |
| `notes.md` | who checked what and when, and every difference found | the rule-pack changelog |

Procedure:
1. A photographs the sources (Day 0).
2. Claude, in a fresh session: "Read docs/reference/sources/notes.md and the images in docs/reference/sources/. Compare
   against `pnpm --filter @fastself/core run print-days 2026-12-01 2027-05-31`. List every difference. Do not change code."
3. Humans decide each difference. Then fix the rule pack, bump its version and add a golden test row per fix.
