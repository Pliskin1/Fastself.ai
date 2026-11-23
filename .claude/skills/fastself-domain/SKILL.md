---
name: fastself-domain
description: Use whenever a task touches Orthodox fasting rules, Ramadan or voluntary Islamic fasts, intermittent fasting windows, prayer times, Julian or Hijri dates, Easter, slava, food levels, allergens, recipe validation or the day plan. Gives the core facts and where the full spec lives.
user-invocable: false
---

# fastself.ai domain cheat sheet

Full spec: `docs/DOMAIN.md` (read the section you need). Golden data: `docs/TESTING.md` §3. Reference code:
`docs/reference/engine.js`. If you are unsure about a religious rule, do not guess: write "PROVJERI: ..." in your report.

## Levels (strict to free)
`voda` (4) > `ulje` (3) > `riba` (2) > `bezmesa` (1) > `mrsno` (0). When several rules apply the **strictest wins**,
then feast relaxations, then the user's cap ("mjera posta" voda/ulje/riba) can only make the shown level milder.

## Orthodox (Julian calendar; dates below are Gregorian; o = days from Easter)
- Easter: Julian computus + 13 days. 2026-04-12, 2027-05-02.
- Free (return at once): Svjatki 7–17 Jan, Bogojavljenje 19 Jan, Svijetla sedmica (o 0..6), Trojičina sedmica
  (o 50..56), Mitar i farisej (o −69..−64). Bijela sedmica (o −55..−49) is `bezmesa`.
- Periods (weekday / weekend): Božićni post 28 Nov – 6 Jan (ulje / riba until 1 Jan, then ulje); Veliki post
  o −48..−1 (voda / ulje); Petrovski post o ≥ 57 to 11 Jul (ulje / riba); Gospojinski post 14–27 Aug (voda / ulje).
- Wednesday and Friday outside free periods: `voda`. Strictest wins, so a Wednesday in Božićni post is voda.
- One-day fasts at `voda` (no Wed/Fri reason on top): Badnji dan 6 Jan, Krstovdan 18 Jan, Usekovanje 11 Sep,
  Krstovdan (Vozdviženje) 27 Sep.
- Relaxations to `riba` (only if stricter than riba): Vavedenje 4 Dec, Sveti Nikola 19 Dec, Blagovijesti 7 Apr,
  Preobraženje 19 Aug, Cvijeti (o −7).
- Slava on a fast day is "posna" with the day's level; otherwise "Ove godine slava je mrsna."

## Islamic
- Hijri: tabular, applied to n − ramadanShift (±1). 1 Ramadan: 1447 → 2026-02-18, 1448 → 2027-02-08, 1449 → 2028-01-28.
- Ramadan fast: fajr (zora) to maghrib (akšam). Sehur reminder fajr − 30 min. Lejletul-kadr: the evening of day 26.
- Nafila suggestions (never in Ramadan, never forced): none on 1 Ševval and 10–13 Zul-hidždže; Arefat 9 Zul-hidždže;
  Ašura 9–10 Muharrem; Šest dana ševvala 2–7 Ševval; Bijeli dani 13–15 of each month; otherwise Monday and Thursday.
- An exception day is not fasted; in Ramadan it counts toward kaza. The reason stays on the device.

## Prayer times
`adhan` package, Shafi asr. Methods: `mwl` (18°/17°), `turkey`, `ummalqura`, and `izcg` (default) = MWL plus minute
offsets calibrated from the official IZ CG vaktija (D-13). User offsets are added last. Podgorica 42.4304, 19.2594.
Europe/Podgorica summer time: last Sunday of March to last Sunday of October.
Golden: 2026-12-02 MWL fajr 05:13, maghrib 16:11.

## Intermittent fasting
Plans 12:12, 14:10, 16:8. The eating window ends at 20:00 (16:8 = 12:00–20:00). Blocked for minors.
With Ramadan or a fasted nafila day the window starts at maghrib and runs to fajr; with IF on it is also capped at
24 − plan hours. The religious rule decides what you eat; the window decides when.

## Meals
- Food groups: povrce, voce, mahunarke, zitarice, orasasto, ulje, riba, mlijecno, jaja, meso, vino. Allergen-only:
  gluten, susam, celer, med, rakovi, mekusci, kikiriki, soja, senf, sulfiti, lupina. Diet-only: svinjetina, alkohol.
- Forbidden by level: voda = meso, mlijecno, jaja, riba, ulje, vino, rakovi, mekusci; ulje = meso, mlijecno, jaja,
  riba, rakovi, mekusci; riba = meso, mlijecno, jaja; bezmesa = meso; mrsno = none.
- Diets: vegetarian forbids meso, riba, rakovi, mekusci; vegan adds mlijecno, jaja, med; halal forbids svinjetina, alkohol.
- Allergens are the EU 14, plus custom words.
- `validateRecipe(recipe, forbidden, customAvoid)` returns reasons (empty = OK). It checks the recipe's categories and
  every ingredient and step against the keyword map (after removing "bez ulja"). It runs on the server and again on
  the device. Extend `FS_KEYWORDS`, never shrink it.
