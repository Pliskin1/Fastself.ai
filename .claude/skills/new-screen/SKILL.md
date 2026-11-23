---
name: new-screen
description: Use when building or rebuilding a screen, tab, pushed screen or sheet in apps/mobile. Gives the file layout, the checklist and the test pattern for fastself.ai screens.
argument-hint: "[screen name, e.g. danas | kalendar | ob-prakse | sheet brisanje]"
---

# Build a fastself.ai screen: $ARGUMENTS

## 1. Read (only these)
- `docs/SCREENS.md`: the section for this screen, plus §0 for its route and §13 for states.
- `docs/COPY.md`: its block. `docs/DESIGN-SYSTEM.md` §7 for component props.
- The prototype markup around its marker: `grep -n "<!-- DANAS -->" docs/reference/prototype/Main.dc.html`, then read
  about 200 lines from there.

## 2. Files
```
apps/mobile/src/app/<route>.tsx              # thin: reads hooks, composes sections, no logic
apps/mobile/src/features/<screen>/            # sections and screen-only components
  <Section>.tsx
  __tests__/<screen>.test.tsx
apps/mobile/src/copy/sr/<area>.ts             # add the strings under the COPY.md keys (area map in COPY.md)
```
Shared components go to `src/components` only if a second screen uses them.

## 3. Checklist
- Root `ScrollView` (or `FlatList`) has `testID="screen-<name>"` and `contentInsetAdjustmentBehavior="automatic"`;
  the bottom padding clears the native tab bar.
- Every control has the `testID` from SCREENS.md, a role, a label, and is at least 44pt.
- Data comes from `@fastself/core` via hooks; the clock comes from `useNow()` (dev clock in __DEV__).
- Strings come from `t('key')`; plurals from `pl()`.
- Entering animations use `motion.ts` presets and turn into fades under Reduce Motion.
- Empty, loading, offline and error states per SCREENS.md §13.
- Haptics: `selection` on toggles and segments, `success` on save and confirm, `warning` before destructive confirms.
- Dynamic Type: test at the largest accessibility size in the Simulator (Settings → Accessibility → Larger Text);
  nothing clips, rows grow.

## 4. Test pattern
```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { withProviders, fixtureSettings, at } from '@/test/utils';
import Danas from '@/app/(tabs)/danas';

test('Božićni post Wednesday with mjera ulje shows "Post na ulju" and not the fish level', () => {
  render(withProviders(<Danas />, { settings: fixtureSettings({ orthodox: true, strictness: 'ulje' }), now: at('2026-12-02T16:30') }));
  expect(screen.getByText('Post na ulju')).toBeTruthy();
  expect(screen.queryByText('Riba dozvoljena')).toBeNull();
});
```
Use fixed dates from TESTING.md §3.5. Assert visible text and the absence of forbidden items; no snapshots.

## 5. Finish
Run `/verify`. Then open the screen in the Simulator at the dates named in the test and compare it with the prototype.
Update `docs/PROGRESS.md` (max 3 lines).
