import { describe, expect, it } from 'vitest';
import {
  HIJRI_MONTHS,
  MONTHS,
  MONTHS_GEN,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  formatDuration,
  formatHm,
  longDate,
  shortDate,
  toDayNum,
} from '../../src/index';

describe('format', () => {
  it('formatHm wraps around midnight', () => {
    expect(formatHm(0)).toBe('00:00');
    expect(formatHm(5 * 60 + 13)).toBe('05:13');
    expect(formatHm(1440 + 65)).toBe('01:05');
    expect(formatHm(-30)).toBe('23:30');
  });
  it('formatDuration does not wrap and never goes negative', () => {
    expect(formatDuration(16 * 60)).toBe('16:00');
    expect(formatDuration(25 * 60 + 5)).toBe('25:05');
    expect(formatDuration(-5)).toBe('00:00');
  });
  it('longDate and shortDate', () => {
    const n = toDayNum(2026, 12, 2);
    expect(longDate(n)).toBe('Srijeda, 2. decembar');
    expect(shortDate(n)).toBe('2.12.');
  });
  it('constants have the right size', () => {
    expect(WEEKDAYS).toHaveLength(7);
    expect(WEEKDAYS_SHORT).toHaveLength(7);
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS_GEN).toHaveLength(12);
    expect(HIJRI_MONTHS).toHaveLength(12);
    expect(HIJRI_MONTHS[8]).toBe('ramazan');
    expect(WEEKDAYS[0]).toBe('Nedjelja');
  });
});
