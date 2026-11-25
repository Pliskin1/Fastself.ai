import { toDayNum } from '@fastself/core';
import { gridSlots, monthOf, selectionFor, shiftMonth } from '../model';

describe('kalendar model', () => {
  it('shiftMonth rolls the year in both directions', () => {
    expect(shiftMonth({ y: 2026, m: 12 }, 1)).toEqual({ y: 2027, m: 1 });
    expect(shiftMonth({ y: 2027, m: 1 }, -1)).toEqual({ y: 2026, m: 12 });
    expect(shiftMonth({ y: 2026, m: 3 }, -15)).toEqual({ y: 2024, m: 12 });
    expect(shiftMonth({ y: 2026, m: 3 }, 24)).toEqual({ y: 2028, m: 3 });
  });

  it('December 2026 has 31 days after one blank (Tuesday start)', () => {
    const slots = gridSlots({ y: 2026, m: 12 });
    expect(slots.slice(0, 2)).toEqual([null, toDayNum(2026, 12, 1)]);
    expect(slots.filter((s) => s !== null)).toHaveLength(31);
    expect(slots.length % 7).toBe(0);
  });

  it('selects today inside its month, else the 1st', () => {
    const today = toDayNum(2026, 12, 2);
    expect(selectionFor(monthOf(today), today)).toBe(today);
    expect(selectionFor({ y: 2027, m: 1 }, today)).toBe(toDayNum(2027, 1, 1));
  });
});
