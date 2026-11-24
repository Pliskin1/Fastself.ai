import { describe, expect, it } from 'vitest';
import { epochFromLocal, isSummerTime, localFromEpoch, toDayNum, utcOffsetMinutes } from '../../src/index';

const utc = (y: number, m: number, d: number, h = 0, min = 0) => Date.UTC(y, m - 1, d, h, min);

describe('tz', () => {
  it('summer time runs from the last Sunday of March to the last Sunday of October', () => {
    expect(isSummerTime(toDayNum(2027, 3, 27))).toBe(false);
    expect(isSummerTime(toDayNum(2027, 3, 28))).toBe(true);
    expect(isSummerTime(toDayNum(2027, 10, 30))).toBe(true);
    expect(isSummerTime(toDayNum(2027, 10, 31))).toBe(false);
    expect(isSummerTime(toDayNum(2026, 12, 2))).toBe(false);
    expect(isSummerTime(toDayNum(2026, 7, 1))).toBe(true);
  });
  it('switches to +2 at 01:00 UTC on 2027-03-28', () => {
    expect(utcOffsetMinutes(utc(2027, 3, 28, 0, 59))).toBe(60);
    expect(utcOffsetMinutes(utc(2027, 3, 28, 1, 0))).toBe(120);
  });
  it('switches back to +1 at 01:00 UTC on 2027-10-31', () => {
    expect(utcOffsetMinutes(utc(2027, 10, 31, 0, 59))).toBe(120);
    expect(utcOffsetMinutes(utc(2027, 10, 31, 1, 0))).toBe(60);
  });
  it('localFromEpoch gives the Podgorica calendar day and minutes', () => {
    expect(localFromEpoch(utc(2026, 12, 2, 11, 0))).toEqual({ n: toDayNum(2026, 12, 2), minutes: 12 * 60 });
    expect(localFromEpoch(utc(2026, 7, 1, 22, 30))).toEqual({ n: toDayNum(2026, 7, 2), minutes: 30 });
    expect(localFromEpoch(utc(2027, 3, 28, 0, 59))).toEqual({ n: toDayNum(2027, 3, 28), minutes: 119 });
    expect(localFromEpoch(utc(2027, 3, 28, 1, 0))).toEqual({ n: toDayNum(2027, 3, 28), minutes: 180 });
  });
  it('epochFromLocal inverts localFromEpoch outside the switch hour', () => {
    for (const ms of [utc(2026, 12, 2, 11), utc(2026, 7, 1, 22, 30), utc(2027, 3, 29, 5), utc(2027, 11, 1, 5)]) {
      const { n, minutes } = localFromEpoch(ms);
      expect(epochFromLocal(n, minutes)).toBe(ms);
    }
  });
});
