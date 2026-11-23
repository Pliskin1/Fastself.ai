import { describe, expect, it } from 'vitest';
import { pl } from './index';

const namirnica = ['namirnica', 'namirnice', 'namirnica'] as const;

describe('pl', () => {
  it.each([
    [1, 'namirnica'],
    [3, 'namirnice'],
    [5, 'namirnica'],
    [11, 'namirnica'],
    [21, 'namirnica'],
    [23, 'namirnice'],
    [112, 'namirnica'],
  ])('%i -> %s', (n, expected) => {
    expect(pl(n, namirnica)).toBe(expected);
  });

  it('uses many for 12..14', () => {
    expect(pl(12, ['sat', 'sata', 'sati'])).toBe('sati');
    expect(pl(14, ['sat', 'sata', 'sati'])).toBe('sati');
  });
});
