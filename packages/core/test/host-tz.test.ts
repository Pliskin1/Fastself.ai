import { expect, it } from 'vitest';

it('runs in a non-European host time zone (UTC+14)', () => {
  expect(new Date(2027, 0, 1).getTimezoneOffset()).toBe(-840);
});
