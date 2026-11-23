# Design system: "Nebeski sat" (React Native implementation)

There are three ideas. The sky follows the real sun for the user's city. The day is shown as a watch face. Cards are liquid
glass through which the sky shows. The sun colour is the only strong accent; it means *time* or *the main action*.
Dark UI only (`userInterfaceStyle: 'dark'`). Everything lives in `apps/mobile/src/theme/`.

## 1. Colours (`tokens.ts`)
```ts
export const color = {
  base: '#03040D',          // under the sky, status areas
  paper: '#F6F2EA',         // primary text
  mist: '#D4D6E6',          // secondary text (≥7:1 on night sky, ≥4.5:1 on glass over dusk)
  mistStrong: '#DADCEB',    // body text on sky without glass
  sun: '#FFC86E',           // accents, time, tab tint, links (link text uses #FFD38A)
  sunCtaTop: '#FFE0A0', sunCtaBottom: '#FFB547', sunInk: '#1F1404',   // primary button
  teal: '#62D6C4', tealInk: '#A6EEE2',     // confirmed, validated, synced
  ember: '#FF8F73', emberInk: '#FFC7B8',   // allergies, destructive, rejected
  ink: '#0B0D24',           // text on light pills
} as const;
export const level = {   // fast levels: always paired with a word, never colour alone
  voda:    { hex: '#9EC5FF', rgb: '158,197,255', ink: '#CFE2FF', title: 'Post na vodi', short: 'voda' },
  ulje:    { hex: '#D9D77E', rgb: '217,215,126', ink: '#ECEBB4', title: 'Post na ulju', short: 'ulje' },
  riba:    { hex: '#62D6C4', rgb: '98,214,196',  ink: '#A6EEE2', title: 'Riba dozvoljena', short: 'riba' },
  bezmesa: { hex: '#F3CB8C', rgb: '243,203,140', ink: '#F9E0B8', title: 'Bez mesa', short: 'bez mesa' },
  mrsno:   { hex: 'rgba(246,242,234,0.5)', rgb: '246,242,234', ink: '#C4C6DA', title: 'Mrsno', short: 'mrsno' },
} as const;
```
Pill patterns:
- Tinted: `rgba(rgb, 0.20)` background with ink text.
- Solid result pill: hex background with `ink` text.
- Mrsno: a 1px border `rgba(255,255,255,0.24)`.

## 2. Typography (`fonts.ts`, `Text.tsx`)
- **Bodoni Moda** (400, 500, italic 400) is only for titles, numbers and time, at 20pt and up.
- **Hanken Grotesk** (400, 500, 600, 700) is used for all UI.

| Token | Font | Size/Line | Use |
|---|---|---|---|
| display | Bodoni 500, tracking −0.6 | 40/44 | screen titles, day title |
| hero | Bodoni 400 | 44/46 | welcome headline |
| dial | Bodoni 400, tabular digits in fixed cells | 62/66 | countdown |
| title | Bodoni 500 | 22/26 | card titles |
| body | Hanken 400 | 16/22 | body |
| bodyStrong | Hanken 600 | 16/22 | row titles |
| small | Hanken 400 | 14/20 | chips, notes |
| caption | Hanken 400 | 13/18 | secondary |
| micro | Hanken 600 | 11/14 | tab labels, week strip |
- Dynamic Type: use `allowFontScaling` with `maxFontSizeMultiplier` 1.6 for display/dial, and leave UI text unrestricted.
  Test at xxxLarge; rows must wrap, not clip.
- Odometer digits: each char sits in a fixed-width `View` (0.58em, colon 0.26em) so the width never jitters.

## 3. Spacing, radius, elevation
- Spacing scale: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22. Screen side padding is 20; the gap between sections is 18.
- Radius:
  - 15–16 small chips, 22 inputs and segment items, 26 cards.
  - 28 primary buttons (height 56), 33 tab bar (native), 36 sheets (native), 48 screen corners (device).
- Hit targets are at least 44×44. Chips in tappable lists are 44 high; read-only chips can be 30–32.

## 4. Glass (`GlassCard.tsx`, `GlassChip.tsx`)
- If `isLiquidGlassAvailable()` (iOS 26+): `<GlassView glassEffectStyle="regular" tintColor="rgba(10,12,36,0.35)">`.
- Else on iOS: `<BlurView intensity={40} tint="dark">` with an overlay view `rgba(10,12,36,0.36)`.
- On Android: no blur (cost and inconsistency); a plain view with `rgba(22,26,58,0.82)` and the same border.
- Both get a 1px border `rgba(255,255,255,0.14)`, plus a top highlight (a 1px `LinearGradient` from `rgba(255,255,255,0.22)`
  to transparent across the top edge).
- Never animate the opacity of a GlassView (iOS limitation). Animate the transform of a wrapper instead.
- Do not nest glass inside glass. Inside cards, use `rgba(255,255,255,0.06)` fills.

## 5. Sky (`SkyBackground.tsx`)
- Absolute fill behind the whole app, mounted once in the root layout.
- Colours come from `core/sky.skyColors(sunAltitude(today, nowHour, city))`. Recompute every 60 s and on foreground, then
  interpolate over 1.6 s (Reanimated `interpolateColor`).
- `LinearGradient` with stops [0, 0.58, 1] and the 3 colours. A horizon glow (radial-ish: an ellipse `Svg` with a
  RadialGradient at the bottom) uses the bottom colour at the glow opacity from core.
- Stars: 54 deterministic points (seeded LCG, the same seed as the prototype) in the top 540pt. Each twinkles with
  `withRepeat(withSequence)` at a random 2.2–5.6 s. Layer opacity is the core star opacity.
  Under Reduce Motion the stars are static.
- Moon: shown when the altitude is below −4°, at top right (x 300, y 64). The disc uses `rgba(233,238,255,0.10)`, the lit part
  is `core.moonPath`, and a soft glow sits behind.
- `demoCycle` (welcome only): the hour value animates 0→24 over 20 s in a loop and drives both the sky and the sun orbit.
- Push screens and sheets use the same sky. Push screens add an overlay `rgba(2,3,12,0.32)` for separation.

## 6. Motion (`motion.ts`)
```ts
export const ease = { expo: Easing.bezier(0.16, 1, 0.3, 1), std: Easing.bezier(0.2, 0, 0, 1) };
export const dur = { micro: 160, small: 260, medium: 420, enter: 560, large: 700, draw: 1500 };
export const spring = { pop: { damping: 14, stiffness: 180, mass: 0.9 }, knob: { damping: 16, stiffness: 260 } };
```
| Moment | Implementation |
|---|---|
| Screen sections enter | `entering={FadeInDown.duration(560).delay(80 + i*60).easing(ease.expo)}` on direct children |
| Onboarding steps | `SlideInRight`/`SlideInLeft` 560 ms expo (direction from the store) |
| Dial progress draw-in | Animated `strokeDashoffset` 1→0 with `pathLength=1`, 1500 ms expo, delay 180 |
| Sun / timer head breathing | glow radius 24↔34, 4 s, `withRepeat(withTiming, -1, true)` |
| Odometer | each digit cell: on change, `FadeInUp`-like translateY −0.42em→0 + opacity, 520 ms expo (key = position + value) |
| Switch knob | spring `knob`; track colour 300 ms |
| Segmented | the selected pill slides (shared value x), spring `pop` |
| Calendar month change | the grid translates ±36 with a fade, 480 ms expo |
| Toast | spring from −140% to 0, out 620 ms expo |
| Press feedback | `Pressable` scale 0.955 with spring back, plus haptic `selection` on toggles and `impactLight` on primary buttons |
| Sheets, push | native (formSheet, Stack); do not re-implement |
- `useReducedMotion()`: replace every entering, draw-in and loop with an instant final state or a 160 ms fade.
- The only permanent motion is the sun or timer breathing and the stars, and both are off under Reduce Motion.

## 7. Components (props in `src/components/*.tsx`)
- Buttons:
  - `PrimaryButton`: label, onPress, disabled, testID. Gold gradient, sun ink, shadow `rgba(255,170,60,0.38)`.
  - `SecondaryButton`: glass. `LinkButton`: text in `#FFD38A`, weight 700, min height 44.
  - `IconButton`: 44 glass circle; `accessibilityLabel` is required by the type.
- `Switch`: a custom 50×30 track and 24 knob, with `accessibilityRole="switch"` and `accessibilityState.checked`.
- `Segmented`: items, value, onChange; `accessibilityRole="tablist"`.
- `ChoiceCard`: title (Bodoni 23), description, checked, disabled; a 28pt round check that pops with a spring.
- `Chip`: variants `yes`, `no`, `toggle`, `add`, `remove`, `readonly`.
- `Pill`: level | tone.
- `DayDial`: dayPlan, now (SharedValue), size = 320. It owns the ticks (computed once with useMemo), the arcs and the sun.
- `RingTimer`: startedAt, planHours.
- `Complication`: kind moon | number.
- `WeekStrip`, `MonthGrid`, `RuleReceipt`, `RecipeCard`, `Toast` (context provider), `ScreenScroll` (safe area, padding,
  bottom inset for native tabs, testID).
- `Icon` (`src/components/Icon.tsx`): one name, two renderers. iOS: `SymbolView` (expo-symbols). Android:
  `MaterialIcons` (@expo/vector-icons). Map:
  | name | iOS (SF Symbol) | Android (MaterialIcons) |
  |---|---|---|
  | today | sun.horizon | wb-twilight |
  | calendar | calendar | calendar-month |
  | plan | list.bullet | list |
  | timer | timer | timer |
  | profile | person.crop.circle | account-circle |
  | sync | cloud | cloud |
  | back / next / expand | chevron.left / chevron.right / chevron.down | chevron-left / chevron-right / expand-more |
  | check / close | checkmark / xmark | check / close |
  | plus / minus | plus / minus | add / remove |
  | edit / privacy | pencil / shield.checkered | edit / verified-user |
  Tab bar icons are set on `NativeTabs.Trigger.Icon` (`sf` + `md`), see PLATFORMS.md §4.

## 8. Accessibility checklist (every screen)
- [ ] Every Pressable has a role and label; icon-only buttons have a label.
- [ ] Toggles expose `checked`, and segments expose `selected`.
- [ ] Contrast: text on glass is ≥4.5:1 (verify on dusk sky at the bottom of the screen; the glass tint ensures it).
- [ ] Dynamic Type at xxxLarge has no clipping; the dial text scales up to 1.6× and then truncates gracefully.
- [ ] VoiceOver reading order follows the visual order. The dial is announced as "Do iftara 36 minuta" (minutes, not seconds).
- [ ] Reduce Motion is respected, and Reduce Transparency falls back to solid `#151829` cards (`AccessibilityInfo.isReduceTransparencyEnabled`).

## 9. Writing style
- Montenegrin ijekavica. Use "ti". Sentence case. No ALL CAPS and no emoji.
- Buttons say the action ("Započni post", "Sačuvaj", "Obriši nalog"), and a toast uses the same verb ("Prakse su sačuvane").
- Errors say what happened and what to do, without apologising: "AI trenutno nije dostupan. Evo naših recepata za danas."
- Never make medical claims: no "detoks", "autofagija", "topi masnoće". Use "Slušaj svoje tijelo" and "Ako ti je loše, prekini post".
