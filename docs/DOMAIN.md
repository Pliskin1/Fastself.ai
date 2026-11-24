# Domain: fasting rules, dates and times

The source of the logic is `docs/reference/engine.js` (prototype, verified). This file is the spec. When they differ,
this file wins and engine.js must be fixed in the port. All functions live in `packages/core` and are pure.

## 0. Core types
```ts
type DayNum = number;            // days since 1970-01-01 in local calendar terms (UTC math, no time zone drift)
type FoodLevel = 'voda' | 'ulje' | 'riba' | 'bezmesa' | 'mrsno';   // strict → free
const LEVEL_RANK = { voda: 4, ulje: 3, riba: 2, bezmesa: 1, mrsno: 0 };
type Practices = { orthodox: boolean; ramadan: boolean; nafila: boolean; ifOn: boolean };
type Strictness = 'voda' | 'ulje' | 'riba';   // "najstrože što držiš", default 'voda' (= tipik)
interface Settings {
  practices: Practices; ifPlan: 12 | 14 | 16; strictness: Strictness; slavaId: string | null;
  allergies: AllergenId[]; customAvoid: string[]; diets: { vegetarian: boolean; vegan: boolean; halal: boolean };
  minor: boolean; city: CityId; prayerMethod: 'izcg' | 'mwl' | 'turkey' | 'ummalqura';
  offsets: { fajr: number; maghrib: number };   // minutes, user adjustable, added on top of method offsets
  ramadanShift: -1 | 0 | 1;                     // shifts the Hijri calendar by days
  exceptions: Record<DayNum, 'zdravlje' | 'putovanje' | 'drugo'>;  // local only
  nafilaDays: Record<DayNum, true>;             // user chose to fast a suggested voluntary day
}
interface Reason { label: string; sub: string; level: FoodLevel | 'vrijeme' | 'filter' | 'slava' }
```

## 1. Calendar helpers
- `toDayNum(y,m,d)` = `floor(Date.UTC(y,m-1,d)/864e5)`. `fromDayNum(n)` gives `{y,m,d,wd}` with wd 0=Sunday.
- **Time zone Europe/Podgorica:** UTC+1. EU summer time UTC+2 runs from 01:00 UTC on the last Sunday of March to
  01:00 UTC on the last Sunday of October. For a calendar date, use the date-level rule from the engine (`fsTz`).
  Times on the switch day itself are within 1 h; tests cover 27–28 Mar 2027.
- **Orthodox Easter** (Julian computus + 13 days, valid 1900–2099):
  `a=y%4, b=y%7, c=y%19, d=(19c+15)%30, e=(2a+4b−d+34)%7, month=floor((d+e+114)/31), day=((d+e+114)%31)+1`,
  then add 13 days. Results 2020–2040 are in TESTING.md §3.1.
- **Julian date ("po starom")** = Gregorian date − 13 days, valid until 2100. Shown as "19. novembar po starom".
- **Hijri** (`hijriDate(n, ramadanShift)`) follows the known month starts in `rule-packs/islamic.v0.1.json`. That
  data is Diyanet-based, from the Montenegro calendar, and is known from 2026-11-10. It is applied to `n − ramadanShift`.
  - Months in a gap between known starts take tabular lengths, and the last one absorbs the remainder (always 29/30).
  - Before the first known start the calendar is plain tabular (`tabularHijri`, from `fsHijri`). After the last one it is
    tabular, shifted to stay continuous.
  - Extend the JSON each year when the next calendar is published, and bump its version.
  - It is shown with the month names in §4, and verified in TESTING.md §3.4.
  - The user can still shift by ±1 day in Vaktija to follow their own džemat.

## 2. Orthodox rule engine (`rules/orthodox.ts` + `rule-packs/orthodox.v0.1.json`)
Rules apply in order. The first matching "free" rule returns immediately. Otherwise fasting rules accumulate and the
**strictest level wins**, then feast relaxations apply, then the user's strictness cap.
Let `E` = Easter DayNum of year y, `o = n − E`, `md = m*100+d`, `weekend = wd ∈ {0,6}`.
Source: [svetosavlje.org, "Pravilo posta za celu godinu"](https://svetosavlje.org/pravilo-posta-za-celu-godinu/)
(retrieved 2026-11-23) for the weekday levels, the Wed/Fri rule and the fish days. It gives old-style dates, shifted
+13 days here. Rules it does not cover (fast boundaries, one-day fasts, Bogojavljenje, Vavedenje, Sveti Nikola) come
from `docs/reference/engine.js`. Each JSON entry carries `src` and its old-style date `os`.

### 2.1 Fast-free periods (return immediately)
| Rule | Condition | Level |
|---|---|---|
| Svjatki | 7.1.–17.1. (md 107–117) | mrsno |
| Bogojavljenje | 19.1. | mrsno |
| Svijetla sedmica | o ∈ [0, 6] | mrsno |
| Trojičina sedmica | o ∈ [50, 56] | mrsno |
| Sedmica Mitara i fariseja | o ∈ [−69, −64] | mrsno |
| Bijela (Sirna) sedmica | o ∈ [−55, −49] | bezmesa (dairy, eggs and fish allowed, no meat) |

### 2.2 Fasting periods
| Period | Dates | Mon, Wed, Fri | Tue, Thu | Sat, Sun |
|---|---|---|---|---|
| Božićni post | 28.11.–6.1. (40 days) | voda | ulje | riba until 30.12. (17.12. old style), then ulje |
| Veliki post | o ∈ [−48, −1] (Čisti ponedjeljak → Velika subota) | voda | voda | ulje |
| Petrovski post | o ≥ 57 and date ≤ 11.7. (variable length; 14 days in 2027) | voda | ulje | riba |
| Gospojinski post | 14.8.–27.8. | voda | voda | ulje |
- One-day fasts set the level to voda, and the Wed/Fri rule is not applied on top of them:
  Badnji dan 6.1., Krstovdan 18.1., Usekovanje 11.9., Krstovdan (Vozdviženje) 27.9.
- **Wednesday and Friday** outside the free periods add the reason "Srijeda" or "Petak" at level voda. The stricter level
  wins, so in Božićni post a Wednesday is voda. Exception: from Tomina nedjelja to Duhovi (o ∈ [7, 49]) the reason is
  at level ulje.
- Period progress is computed for the subtitle: "Božićni post, 5. dan od 40".

### 2.3 Feast relaxations
These apply only if the current level is stricter than riba, and they set it to riba:
Vavedenje 4.12., Sveti Nikola 19.12., Blagovijesti 7.4., Preobraženje 19.8., Cvijeti (o = −7),
Prepolovljenje (o = 24), Odanije Vaskrsa (o = 38), Petrovdan 12.7., Velika Gospojina 28.8. The last four only change a
Wednesday or Friday, because only then is the level stricter than riba.

### 2.4 Mjera posta (user strictness cap)
If `strictness ≠ 'voda'` and `rank(level) > rank(strictness)`, set `level = strictness` and append the reason
"Tvoja mjera posta: najstrože što držiš: <short>". Mrsno and bezmesa are never changed.

### 2.5 Output
`orthodoxRule(n, settings) → { level, reasons: Reason[], period?: { id, name, index, length } }`.
With no rule at all: `{ level: 'mrsno', reasons: [{ label: 'Običan dan', sub: 'nema posta' }] }`.

### 2.6 Rule pack JSON (data, versioned)
The file is `packages/core/rule-packs/orthodox.v0.1.json`. Shape:
- `free[]`, `oneDay[]` and `relax[]` entries select a day with `fixed` (`"MM-DD"`, or `[from, to]` that may wrap the
  year end) or `easter` (an offset, or `[from, to]`).
- `periods[]` use the same selectors, plus `easterFrom` and `fixedTo` for Petrovski. Each has a `week` map
  (`mon`…`sun` → level), or `segments[]` with their own range and `week` (Božićni).
- `weekly` has `days` (`wed`, `fri` → reason label), `level`, and `overrides[]` by Easter range.
- `oneDay` entries with `keepsPeriod` keep that period's progress (Badnji dan = Božićni post, day 40 of 40).
- Every entry has `name`, an optional `sub`, `src`, and `os` for fixed dates.

The engine interprets this. The version `rule pack v0.1` is shown in the why receipt and sent with error reports.
**Human verification is required** against the church calendar (TESTING.md §3.2). If the church calendar differs,
fix the JSON, not the code.

## 3. Slava (`slava/`)
The list (id, name, Gregorian date):
- nikola 19.12, jovan 20.1, djurdjevdan 6.5, vasilije 12.5, arandjel 21.11, mitrovdan 8.11, lucindan 31.10,
  petrovdan 12.7, ilindan 2.8, stefan 9.1.

`nextSlava(today, slavaId)` returns the next occurrence on or after today, with days until it and the dayPlan for that day.
The card shows within 60 days. Text:
- Fast day: "Pada na posni dan: <level title lowercase>. Spremi posnu trpezu."
- If the level is voda or ulje, add "Za ribu na slavi pitaj sveštenika, često se blagoslovi."
- Otherwise: "Ove godine slava je mrsna."

## 4. Islamic practices (`rules/islamic.ts`)
- Hijri month names (sr): muharem, safer, rebiul-evvel, rebiul-ahir, džumadel-ula, džumadel-uhra, redžeb, šaban, ramazan,
  ševval, zul-kade, zul-hidždže.
- **Ramadan:** the Hijri month is 9. The fasting window runs from fajr to maghrib. `ramadanDay = hijri.d`.
  The month length is 30 if day n0+29 is still month 9, otherwise 29.
  - Lejletul-kadr: the evening of day 26 (n0+25), labelled "noć uoči 27. ramazana".
  - Ramazanski bajram is 1 Shawwal (n0+len).
- **Voluntary (nafila) suggestions**, only when not Ramadan. They are suggestions and never force a fast.
  - Forbidden days get none: 1 Shawwal (Bajram), 10–13 Zul-hidždže (Kurban-bajram and tešrik days).
  - 9 Zul-hidždže is Dan Arefata; 9 and 10 Muharram are Ašura.
  - 2–7 Shawwal are "Šest dana ševvala".
  - Days 13–15 of any month are "Bijeli dani, <d>. <month>".
  - Otherwise Monday and Thursday are "Ponedjeljak, sunnet post" and "Četvrtak, sunnet post".
  - When the user taps "Postim danas", `nafilaDays[n] = true` and the day gets a fajr→maghrib window.
- **Exceptions:** if `exceptions[n]` is set:
  - The day is not fasted: no window, level mrsno for UI, title "Danas ne postiš".
  - In Ramadan the subtitle is "<d>. ramazan, dan za naknadu" and the day counts toward kaza.
  - The reason stays local.
- **Halal diet** forbids pork and alcohol (categories `svinjetina`, `alkohol`).

## 5. Prayer times (`prayer/`)
- Use the `adhan` library: `CalculationParameters`, Shafi madhab for asr (factor 1), high-latitude rule MiddleOfTheNight.
- Methods:
  - `mwl`: fajr 18°, isha 17°.
  - `turkey`: Diyanet.
  - `ummalqura`: fajr 18.5°, isha 90 min after maghrib.
  - `izcg` (default): fajr 19.5°, isha 17.5°, standard (Shafi) asr, as IZ CG states on monteislam.com/vaktija.
    Per-prayer minute offsets on top: fajr +1, sunrise −8, dhuhr +1, asr +1, maghrib +8, isha +2. The ±8 are IZ CG's
    safety minutes. Calibrated 2026-11-23 against the official vaktija for Podgorica, November 2026 (all 30 days within
    ±1 min; `docs/reference/sources/monteislam-vaktija-podgorica-2026-11-23.md`). Recheck against each new month.
- User offsets (`offsets.fajr`, `offsets.maghrib`) are added last.
- Output: minutes from local midnight for fajr, sunrise, dhuhr, asr, maghrib and isha, plus `HH:MM` formatting.
  Must agree with the engine values in TESTING.md §3.3 within ±1 min (MWL).
- Cities (lat, lng), all in tz Europe/Podgorica:
  - Podgorica 42.4304, 19.2594; Nikšić 42.7731, 18.9445; Bar 42.0931, 19.1003; Ulcinj 41.9294, 19.2244.
  - Bijelo Polje 43.0383, 19.7476; Rožaje 42.8333, 20.1667; Pljevlja 43.3567, 19.3584; Berane 42.8425, 19.8733.
  - Plav 42.5969, 19.9450; Herceg Novi 42.4531, 18.5375; Cetinje 42.3931, 18.9116.
  - Location permission picks the nearest city. Coordinates are never stored.

## 6. Intermittent fasting
- Plans are 12:12, 14:10 and 16:8. There is no extended fasting, and minors (`settings.minor`) cannot enable IF.
- The default eating window ends at 20:00, so it starts at 20 − (24 − plan): 16:8 is 12:00–20:00, 14:10 is 10:00–20:00 and
  12:12 is 08:00–20:00. Window start and end are user adjustable in a later version; v1 is fixed.

## 7. Day plan (`plan/dayPlan.ts`)
`dayPlan(n, settings) → DayPlan`:
```
orth = practices.orthodox ? orthodoxRule(n) (with strictness) : null
level = orth?.level ?? 'mrsno'
hijri = hijriDate(n, ramadanShift)
ram = practices.ramadan && hijri.m == 9 ? hijri.d : 0
naf = practices.nafila && !ram ? nafilaSuggestion(n, hijri) : null
nafFast = naf && nafilaDays[n]
times = (practices.ramadan || practices.nafila) ? prayerTimes(n, city, method, offsets) : null
ifH = practices.ifOn && !minor ? ifPlan : 0
window:
  if ram or nafFast: start = maghrib, end = fajr + 24h; if ifH: end = min(end, start + (24 − ifH)); kind = ramazan | nafila
  elif ifH: start = 20 − (24 − ifH), end = 20, kind = 'if'
  else none
if exception[n]: window = none, level shown as mrsno, title "Danas ne postiš"
```
Title and subtitle priority:
1. Orthodox fast day: the level title, plus "<period>, <i>. dan od <len>", plus ", i <d>. ramazan" if both apply.
2. Ramadan: "<d>. ramazan", "Post od zore do akšama, <year>. po Hidžri".
3. Nafila fasted: "Dobrovoljni post", <naf name>.
4. Orthodox free day with a named reason: "Mrsno", "<reason>, <sub>".
5. IF only: "IF 16:8", "Prozor za jelo 12:00–20:00".
6. Otherwise: "Danas nema posta", either "Dobrovoljni post je moguć: <naf>" or "Nijedno tvoje pravilo ne važi za ovaj dan".

Level titles: voda "Post na vodi", ulje "Post na ulju", riba "Riba dozvoljena", bezmesa "Bez mesa", mrsno "Mrsno".
**Combination principle:** the religious rule decides *what* you eat and the time window decides *when*. Windows intersect;
food rules take the strictest.

## 8. Food categories and validation (`meals/`)
- Categories:
  - Food groups: povrce, voce, mahunarke, zitarice, orasasto, ulje, riba, mlijecno, jaja, meso, vino.
  - Allergen-only: gluten, susam, celer, med, rakovi, mekusci, kikiriki, soja, senf, sulfiti, lupina.
  - Diet-only: svinjetina, alkohol.
- FORBID by level:
  - voda: meso, mlijecno, jaja, riba, ulje, vino, rakovi, mekusci
  - ulje: meso, mlijecno, jaja, riba (rakovi, mekusci and vino are allowed, per svetosavlje.org "post na ulju i vinu")
  - riba: meso, mlijecno, jaja
  - bezmesa: meso
  - mrsno: none
- Diets: vegetarian forbids meso, riba, rakovi, mekusci; vegan adds mlijecno, jaja, med; halal forbids svinjetina, alkohol.
- EU 14 allergens map to categories: Gluten, Mlijeko i laktoza, Jaja, Riba, Rakovi, Mekušci, Kikiriki, Orašasti plodovi,
  Soja, Susam, Celer, Senf, Sulfiti, Lupina. Users can add custom words (e.g. "kivi").
- `forbiddenFor(dayPlan, settings)` returns a map category → source (`pravilo` | `dijeta` | `alergija`) with a label.
- `validateRecipe(recipe, forbidden, customAvoid)` returns `string[]` reasons (empty means OK):
  - A category listed on the recipe is a hit.
  - So is a keyword found in the ingredients or any step (case-insensitive, after removing the phrase "bez ulja").
    The keyword map is in engine.js `FS_KEYWORDS`; extend it but never shrink it.
  - The reason text names the step: "Sadrži ulje (korak 2: „Dodaj malo maslinovog ulja”), a danas je post na vodi."
  - A custom avoid word appearing anywhere is a hit.
- Recipe shape:
  `{ id, title, timeMin, meals: ('dorucak'|'rucak'|'vecera'|'sehur'|'iftar')[], cats: Category[], ingredients: string[], steps: string[] }`.
- `recipes.sr.json`: start with the 18 from engine.js. P1 target is 40, covering every level and meal so at least 3 pass on
  a voda day for each meal. Test: every recipe's own `cats` is consistent with its text (validator self-check).
- `shoppingList(planDays)` aggregates ingredients and counts meals, sorted with `localeCompare('sr-Latn')`.

## 9. Sky and moon (`sky/`)
- `sunAltitude(n, minutes, lat, lng)` (minutes from local midnight) follows the engine `fsSunAlt`. It returns degrees and morning/evening.
- `skyColors(alt, morning)` interpolates the keyframe tables `FS_SKY_M` and `FS_SKY_E` (3 stops: top, mid, bottom).
  - Stars opacity is `clamp((−alt − 4)/10, 0, 1)`.
  - Horizon glow opacity is `max(0, 1 − |alt|/16) * 0.85`.
- `moonPhase(n)`: synodic month 29.530588853 days, reference new moon JD 2451550.26. It returns `{ phase 0..1,
  illumination, name }`. The names are in engine.js. `moonPath(phase, cx, cy, r)` gives an SVG path of the lit part.

## 10. Plan statistics
`rangeStats(start, days, settings)` counts voda, ulje, riba and bezmesa, Ramadan days, free days and nafila suggestions.
Used for the Plan tab's stacked bar.
