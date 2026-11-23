# Screens

Visual source of truth: `docs/reference/prototype/Main.dc.html`. Grep the comment markers
(`<!-- DANAS -->`, `<!-- KALENDAR -->`, `<!-- PLAN -->`, `<!-- TAJMER -->`, `<!-- PROFIL -->`, `ONBOARDING`, `DONJI LIST`).
The prototype was built at 390×844 points. Map px 1:1 to pt. Text keys are in `docs/COPY.md`. Tokens are in
`DESIGN-SYSTEM.md`. Every screen has `testID="screen-<name>"` on its root ScrollView.

## 0. Navigation map (Expo Router, `apps/mobile/src/app`)
```
_layout.tsx            Stack (headerShown false) over <SkyBackground/>; providers; fonts; db
index.tsx              → /(onboarding)/welcome if !settings.onboarded else /(tabs)/danas
(onboarding)/_layout   Stack; custom header with back + "Korak N od 5" + progress bar (hidden on welcome)
  welcome  prakse  alergije  sigurnost  dozvole  nalog
(tabs)/_layout         NativeTabs: danas (sun.horizon), kalendar (calendar), plan (list.bullet), tajmer (timer), profil (person.crop.circle)
  danas  kalendar  plan  tajmer  profil
prakse  alergije  vaktija  privatnost  asistent  nalog    Stack push screens (native slide + back swipe); header = back + title
(sheets)/prijava-greske  ai-pristanak  brisanje  izuzetak  kupovina     presentation 'formSheet', grabber, detents ['medium','large']
dev                    only if __DEV__: demo date/time, presets, reset, scheduled notifications list, "send test
                       notification in 5 s", component gallery
```
Dev deep link (only in `__DEV__`, used by Maestro): `fastself://dev?reset=1&preset=<id>&date=YYYY-MM-DD&time=HH:MM&tab=<tab>`.
All params are optional. `reset=1` wipes local data. `preset` sets practices, city Podgorica, allergies empty and
`onboarded=true`: `orthodox-if` (orthodox + IF 16:8), `orthodox`, `ramadan-nafila`, `ramadan-if` (IF 16:8), `if14`
(IF 14:10 only). `date` and `time` set the dev clock (it keeps ticking from there). `tab` opens that tab.
Native push and sheet transitions provide the parallax and card-stack effects. Do not rebuild them in JS.

Android (development platform this week, store release in v1.1). Same screens and testIDs. The full list of platform
differences, and where each one lives in code, is `docs/PLATFORMS.md` §4. The visible ones:
- NativeTabs render as Material bottom tabs (use the same labels; icons via the `android` icon prop).
- No `AppleAuthenticationButton`: the nalog flow starts with the email field.
- Glass falls back to a translucent fill (DESIGN-SYSTEM §4). Sheets are bottom sheets; the back button pops screens.
- Notifications: request `POST_NOTIFICATIONS` (Android 13+) in the same dozvole step.
It must work and look decent; pixel parity with iOS is not a goal this week.

## 1. Onboarding
The header shows a back IconButton (44pt, glass) on the left; on the right "Korak N od 5" and a 128×4 progress bar
whose fill animates its scaleX. The footer CTA is fixed at the bottom over a fade gradient (COPY `ob.*`). On every step the footer CTA has
`testID="btn-next"`, whatever its text.
Steps slide in from the right going forward and from the left going back (Reanimated entering `SlideInRight`/`SlideInLeft`,
560 ms expo).

1.1 **welcome** (`screen-welcome`)
- Full-screen animated sky: a 20 s day cycle where the sun orbits the dial and the sky colours cycle.
  Use SkyBackground in `demoCycle` mode; under Reduce Motion it is a static dusk.
- Brand row: a mini dial icon with "fastself.ai".
- Headline (Display 44): "Svaki post ima svoje vrijeme." Body 17.
- Buttons: `btn-start` "Počni" (primary), `btn-have-account` "Već imam nalog" (ghost, goes to nalog with returning=true),
  and the caption "Radi bez naloga. Podaci ostaju na telefonu."

1.2 **prakse** (`screen-ob-prakse`; the shared component `PracticesForm` is also used by the push screen `prakse`)
- Group headings: Pravoslavlje / Islam / Navika.
- Choice cards are toggle buttons with `accessibilityRole="checkbox"` and the checked state:
  - `choice-orthodox`, `choice-ramadan`, `choice-nafila`.
  - `choice-if`: disabled when minor, with the description from COPY `prakse.if.minor`.
- When orthodox is on, a glass panel expands (entering FadeInDown):
  - "Najstrože što držiš": Segmented `seg-strog-voda|ulje|riba` with the note `prakse.strog.note.<value>`.
  - A "Krsna slava" disclosure row `btn-slava` that opens a chip list `chip-slava-<id>` (11 options incl. "Bez slave").
- When IF is on: Segmented `seg-if-12|14|16`.
- Combo note: orthodox + IF, or ramadan + IF (COPY).
- CTA `btn-next` "Nastavi" is disabled until at least one practice is chosen. On the push screen the CTA is "Sačuvaj" and a toast shows.

1.3 **alergije** (`screen-ob-alergije`; shared `AllergiesForm`)
- A "Tvoja lista" card with the count ("3 namirnice", Montenegrin plural rules) and removable chips `chip-my-<id>` in the
  žar colour (`<id>` is the allergen id, or the lowercased custom word, e.g. `chip-my-kivi`).
- A TextInput `input-allergen` with the label "Dodaj svoju namirnicu", placeholder "npr. kivi", and a "Dodaj" button.
  Submitting by return key also adds. An input that matches an EU allergen name adds that allergen.
- "Česti alergeni sa EU liste": add-chips `chip-add-<id>` for those not yet added.
- "Ishrana": toggle chips vegetarijanska / veganska / halal (vegan and vegetarian are mutually exclusive).
- Disclaimer caption. CTA "Nastavi".

1.4 **sigurnost** (`screen-ob-sigurnost`)
- 4 switch rows: `sw-preg`, `sw-diab`, `sw-ed`, `sw-minor`.
- If any is on, show a status note: the minor text or the general text (COPY).
- A "fastself.ai nije medicinska aplikacija" card. CTA "Razumijem, nastavi".
- These answers are stored **only** in the local `safety` table and are never synced.

1.5 **dozvole** (`screen-ob-dozvole`)
- If ramadan or nafila: a city card with "Koristi moju lokaciju" (`btn-location`).
  - It requests WhenInUse once, picks the nearest city and discards the coordinates.
  - "Izaberi grad ručno" `btn-city-manual` expands city chips.
- Otherwise a note: "Za prakse koje si izabrao lokacija ne treba, pa je ne tražimo."
- Reminders card: `btn-notif` requests notification permission. The button turns teal "Podsjetnici su uključeni" when granted.
- Both permissions are optional. CTA "Nastavi" always works.

1.6 **nalog** (`screen-ob-nalog`; shared `AccountFlow`, also used by the push screen `nalog`). States:
- start:
  - Title, sub (returning vs new) and 3 check bullets (new user only).
  - The native `AppleAuthenticationButton` (type CONTINUE, style WHITE, cornerRadius 28, height 56).
  - Divider "ili emailom", an email input `input-email` with `textContentType="emailAddress"`, and `btn-send-code` "Pošalji kod" (disabled until valid).
  - "Nastavi bez naloga" `btn-skip-account` (onboarding only), then the terms and privacy links.
- code: 6 boxes over a hidden TextInput `input-code` with `textContentType="oneTimeCode"` and the label "Kod iz emaila".
  Then `btn-verify` "Potvrdi" and "Promijeni email".
- consent:
  - Switches `sw-sync-practices`, `sw-sync-allergies`, `sw-sync-history` (all default on).
  - Note text, then `btn-enable-sync` "Uključi sinhronizaciju" and "Ne sada".
  - Both write `consents` rows and finish onboarding (or pop).
- Errors are inline text under the field: invalid code, network, expired code.

## 2. Danas (`screen-danas`)
Top to bottom (staggered entering, 60 ms):
1. Row: the date "Srijeda, 2. decembar" and a glass cloud icon button `btn-sync-status` (teal if synced; goes to Profil).
2. Title row: a 12pt glowing level dot and the Display 40 title, then the subtitle.
   Practice chips form one button `btn-edit-practices` that pushes `prakse`.
3. **DayDial** (320×320, `dial`):
   - Glass face and rim, 96 ticks (major every hour, longer at 0/6/12/18), Bodoni italic numerals 00/06/12/18 and small 03/09/15/21.
   - A 24h ring (00 at top, clockwise) with the fast arc (pale blue 26%) and the eat arc (gold gradient + blur glow).
   - The progress arc of the current phase is drawn in with pathLength animation on mount.
   - Markers for window start and end, and the sun at the current time (breathing glow).
   - Centre: the label ("Do iftara" / "Do kraja posta" / "Do zore" / "Prozor za jelo još"), an odometer HH:MM (Bodoni 62)
     with seconds (Bodoni 20, 70% opacity), and the sub ("iftar u 17:06").
   - With no window: the full ring in the level colour and a big italic word (voda/ulje/riba/mrsno).
   - `accessibilityRole="timer"` and a label updated each minute (not each second).
4. Legend: "post 20:00–12:00" and "jelo 12:00–20:00" (only with a window).
5. Complications: up to 3 glass circles, 104pt (`comp-moon`, `comp-julian`, `comp-hijri`, or the IF streak).
6. If there is an exception today: a card "Danas ne postiš…" with `btn-undo-exception` "Ipak postim".
7. **Plate card** "Danas na tanjiru": "Može" chips (check icon in the level ink) and "Ne može" chips (x icon, with an
   "alergija" note for allergens). With no limits: "Danas nema ograničenja u hrani."
8. Actions: `btn-what-to-eat` "Šta da jedem" (primary, pushes asistent) and `btn-why` "Zašto voda?" (secondary, toggles the receipt).
9. **Why receipt** `why-receipt` (dashed glass):
   - Rows of reason, sub and pill.
   - A divider, then "Važi za danas" with the result pill and the caption "Strože pravilo uvijek pobjeđuje. Paket pravila v0.1…".
   - Links: `btn-report-day` "Prijavi grešku" (opens the prijava-greske sheet with context), and `btn-cant-fast`
     "Danas ne mogu da postim" (opens the izuzetak sheet; only on fast days).
10. **Ramadan card** (ramadan day):
    - "Ramazan" with "1. od 30 dana" and a 10×3 dot grid. Past days are gold, exception days žar, today white-gold glowing,
      the 27th night has an outline.
    - Then "Nema dana za naknadu" / "Dana za naknadu: N", Lejletul-kadr and Bajram.
11. **Vaktija card** (Ramadan or nafila fasting):
    - 6 time cells. Zora and akšam are highlighted gold.
    - "Podesi" pushes vaktija. Caption with the sehur reminder time.
12. **Nafila suggestion** card with `btn-nafila-on` "Postim danas", or the active state with "Otkaži".
13. **Ramadan countdown** (ramadan practice, not in Ramadan): a big number, "dana do Ramazana", the date and a note.
14. **Slava card** (within 60 days): the when line, a pill (posna, riba), the saint name (Bodoni 26), the date and the rule text.
15. **Week strip** "Sedmica": 7 capsules with the weekday ("Danas" first), the date number (Bodoni 24) and a short label;
    level gradient fill, today ringed. Each has an accessibilityLabel with the full title.
16. Disclaimer caption.

Live behaviour:
- The countdown ticks every second via a shared value; the whole screen re-renders at most once a minute.
- The sky recomputes every minute. Data comes from `useDayPlan(today)`, with today taken from the dev clock in __DEV__.

## 3. Kalendar (`screen-kalendar`)
- Header: the month (Display 40), the year (italic 20) and `btn-cal-today` "Danas" (only when not on today).
  Then `btn-cal-prev` and `btn-cal-next` IconButtons.
- Glass month card: weekday header Pon…Ned and a 7-column grid.
  - Each cell `cal-<yyyy-mm-dd>` is a 48pt button with a 40pt orb.
  - Orbs: a radial fill in the level colour, gold for Ramadan, a ring for a suggested nafila.
  - Today has a gold ring with glow, the selected day a white ring, the slava day a star.
  - accessibilityLabel "4. decembar, Riba dozvoljena, danas".
- The month change slides the grid ±36pt with a fade.
- Legend chips for the active practices.
- Selected day card: the long date, "po starom" (orthodox), Hijri (Islamic), the result pill and reasons, plus
  `btn-report-selected`.

## 4. Plan (`screen-plan`)
- Header "Plan" and Segmented `seg-range-7|30`.
- Summary card: "Narednih 7 dana", a 12pt stacked bar (flex segments per level, Ramadan, free) and stat chips.
- Jelovnik card (P1 `flags.mealPlan`):
  - Text and `btn-make-meal-plan`. AI consent is required: if missing, the ai-pristanak sheet opens and resumes the action.
  - Loading row.
  - When done: `btn-shopping` "Spisak za kupovinu" opens the kupovina sheet (checklist with counts "za 3 obroka").
- Timeline: a vertical line with glowing nodes. Rows show the weekday/date, a pill, the time line
  ("Zora 05:14, iftar 17:06", "Jelo 12:00–20:00"), the slava line, and meal lines when the plan exists.

## 5. Tajmer (`screen-tajmer`)
- IF off: a card "IF nije uključen" with `btn-enable-if` (pushes prakse); for minors, the "Nije dostupno" card.
- IF on:
  - Segmented plan; a 300pt ring (glass face, glow, progress, 12h and 14h milestone dots, comet head breathing).
  - Centre: state, odometer HH:MM:SS (Bodoni 46) and the goal line.
  - 3 glass stats (Početak, Kraj, Podsjetnik).
  - `timer-toggle` "Započni post" (primary) / "Završi post" (secondary).
  - A result message, a combo note ("Danas je i post na vodi…") and a "Zadnjih 7 dana" bar chart (today gold).
  - Safety caption.
- Start schedules a local notification at start + plan h; stop cancels it. Stopping early gives a kind message, never guilt.

## 6. Profil (`screen-profil`)
- Account card:
  - Logged out: "Podaci su samo na ovom telefonu" + `btn-open-account`.
  - Logged in: an avatar initial, a label (Apple: "Apple nalog, skriveni email"), the sync state and `btn-logout`.
- Groups (glass lists, row height ≥58):
  - **Post i ishrana**: `row-practices` (summary), `row-allergies`, `row-vaktija`.
  - **Podsjetnici**: switches `sw-rem-evening`, `sw-rem-window`, `sw-rem-if`, `sw-rem-ramadan`.
  - **Privatnost i podaci**:
    - `sw-ai` (turning it on opens the consent sheet; turning it off is immediate with a toast).
    - `sw-sync` (logged out: opens the account flow).
    - `row-privacy` pushes privatnost. `row-export` writes JSON and opens the share sheet.
    - `row-delete` "Obriši nalog" / "Obriši podatke sa telefona" opens the brisanje sheet.
  - **Pomoć**: `row-report`.
- Footer: version (from expo-constants), rule pack version and the disclaimer.

## 7–9. Pushed screens
- **prakse**: PracticesForm plus "Sačuvaj".
- **alergije**: AllergiesForm plus "Sačuvaj".
- **vaktija** (`screen-vaktija`):
  - City card with `btn-change-city` and chips; today's zora and akšam.
  - Method radio list `radio-method-<id>`.
  - Manual correction rows with −/+ IconButtons: `btn-fajr-minus`, `btn-fajr-plus`, `btn-maghrib-minus`,
    `btn-maghrib-plus`, `btn-shift-minus`, `btn-shift-plus` (±1 day max).
- **privatnost** (`screen-privatnost`): 4 glass sections (Na telefonu ostaje / Na server ide / AI vidi / Tvoja prava) and
  `btn-open-policy`, which opens the policy URL in an in-app browser (expo-web-browser). The AI provider is named.

## 10. Šta da jedem, the asistent screen (`screen-asistent`)
- Context card: "Danas: post na vodi" and the line "Bez: …. Alergije: …."
- Segmented `seg-source-ours|ai` ("Naši recepti" / "AI prijedlog") and Segmented meal options:
  doručak/ručak/večera, or sehur/iftar on Ramadan days.
- **ours**:
  - The count line "6 recepata odgovara danu i tvojoj listi. Radi bez interneta i bez AI-ja."
  - Accordion cards `recipe-<id>`: title (Bodoni 21), a teal shield "Provjereno: …", the time and a chevron.
  - Expanded: ingredients, numbered steps and "Prijavi problem sa receptom".
- **ai**:
  - Ingredient toggle chips; "Šta tačno šaljemo AI-ju?" disclosure with the JSON payload (monospace) and a note.
  - `btn-generate` "Predloži 3 jela", which requires consent.
  - Loading: 3 steps with spinner and check states, and 2 shimmer skeletons.
  - Done: the "N recepta su prošla provjeru" accordion list, the rejected card (žar dashed, strikethrough title + reason),
    and "Novi prijedlog".
  - Network or AI error: inline text "AI trenutno nije dostupan. Evo naših recepata za danas." and the ours list.
- Footer caption.

## 11. Sheets (formSheet)
- **prijava-greske**:
  - The context line, type chips (`chip-report-pravilo|vrijeme|recept|drugo`) and a textarea `input-report` (min 3 chars).
  - A note on what is sent, then `btn-send-report`, which inserts into `reports` (anon allowed) and shows the toast "Prijava je poslata. Hvala."
- **ai-pristanak**:
  - Title, 3 bullets of what is sent, and the provider by name ("Anthropic (Claude)" or the chosen one).
  - What is never sent. `btn-ai-allow` "Dozvoli" writes `consents(kind='ai', granted=true)` and resumes the pending action.
    "Ne sada" closes.
- **brisanje**:
  - Title and text (logged in vs local), the Apple revoke note and `btn-confirm-delete` (žar gradient).
  - On confirm: logged in calls `delete-account` and signs out (then asks "Obriši i podatke sa telefona?", default yes);
    local wipes the db and goes to welcome.
- **izuzetak**: reason chips (Zdravlje / Putovanje / Drugo), the Ramadan kaza note and `btn-confirm-exception` "Ne postim danas".
- **kupovina**: the checklist (checkbox role), counts and the "Iz jelovnika za narednih 7 dana" caption.

## 12. Toast
A glass capsule drops in from the top safe area with a spring and disappears after 2.6 s. It uses an accessibility
announcement (`AccessibilityInfo.announceForAccessibility`). Max one at a time.

## 13. States to implement for every data screen
- Loading: skeleton or nothing, never a spinner over 300 ms on local data.
- Empty states: Danas with no practices shows "Danas nema posta" plus a link to choose practices.
- Error states: network errors only on AI, sync and auth, each with a retry.
- Offline: everything except AI, sync and auth works; AI shows the fallback.
