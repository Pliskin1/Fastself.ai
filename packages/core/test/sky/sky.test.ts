import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  horizonGlowOpacity,
  moonPath,
  moonPhase,
  skyColors,
  starsOpacity,
  sunAltitude,
  toDayNum,
} from '../../src/index';

const LAT = 42.4304;
const LNG = 19.2594;
const RGB = /^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/;

describe('sunAltitude (TESTING 3.7, Podgorica 2026-12-02)', () => {
  const n = toDayNum(2026, 12, 2);
  it('06:54 is about -0.8 degrees, morning', () => {
    const s = sunAltitude(n, 6 * 60 + 54, LAT, LNG);
    expect(s.alt).toBeCloseTo(-0.8, 0);
    expect(Math.abs(s.alt + 0.8)).toBeLessThan(0.5);
    expect(s.morning).toBe(true);
  });
  it('12:00 is 25.3 degrees within 0.3', () => {
    const s = sunAltitude(n, 12 * 60, LAT, LNG);
    expect(Math.abs(s.alt - 25.3)).toBeLessThanOrEqual(0.3);
  });
  it('16:11 is about -0.8 degrees, evening', () => {
    const s = sunAltitude(n, 16 * 60 + 11, LAT, LNG);
    expect(Math.abs(s.alt + 0.8)).toBeLessThan(0.5);
    expect(s.morning).toBe(false);
  });
  it('uses summer time in July (noon is later than solar noon by about 2 h)', () => {
    const july = toDayNum(2026, 7, 1);
    const hi = sunAltitude(july, 13 * 60 + 30, LAT, LNG).alt;
    expect(hi).toBeGreaterThan(65);
  });
});

describe('moonPhase (TESTING 3.7)', () => {
  it.each([
    [[2026, 12, 9], 'mladi mjesec'],
    [[2026, 12, 24], 'pun mjesec'],
    [[2027, 2, 6], 'mladi mjesec'],
    [[2027, 2, 20], 'pun mjesec'],
  ] as const)('%j is %s', ([y, m, d], name) => {
    expect(moonPhase(toDayNum(y, m, d)).name).toBe(name);
  });
  it('full moon is bright and new moon is dark', () => {
    expect(moonPhase(toDayNum(2026, 12, 24)).illumination).toBeGreaterThan(0.9);
    expect(moonPhase(toDayNum(2026, 12, 9)).illumination).toBeLessThan(0.1);
  });
  it('property: phase in [0,1) and illumination in [0,1]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 40000 }), (n) => {
        const r = moonPhase(n);
        expect(r.phase).toBeGreaterThanOrEqual(0);
        expect(r.phase).toBeLessThan(1);
        expect(r.illumination).toBeGreaterThanOrEqual(0);
        expect(r.illumination).toBeLessThanOrEqual(1);
      }),
    );
  });
  it('covers every phase name over a month', () => {
    const names = new Set<string>();
    for (let i = 0; i < 30; i++) names.add(moonPhase(toDayNum(2026, 12, 1) + i).name);
    expect(names.size).toBeGreaterThanOrEqual(7);
  });
});

describe('moonPath', () => {
  it('draws a closed path for waxing and waning phases', () => {
    for (const p of [0.1, 0.25, 0.4, 0.6, 0.75, 0.9]) {
      const d = moonPath(p, 50, 50, 20);
      expect(d.startsWith('M 50 30')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
    }
  });
});

describe('skyColors', () => {
  it('always returns three rgb strings, including above 90 and below -90', () => {
    for (const alt of [-120, -90, -50, -18, -9, -3, 0, 3, 10, 15, 45, 89, 90, 91, 120]) {
      for (const morning of [true, false]) {
        const c = skyColors(alt, morning);
        expect(c).toHaveLength(3);
        for (const s of c) expect(s).toMatch(RGB);
      }
    }
  });
  it('returns the keyframe colour exactly at a keyframe', () => {
    expect(skyColors(-90, true)).toEqual(['rgb(3,4,13)', 'rgb(8,11,34)', 'rgb(16,21,51)']);
    expect(skyColors(15, true)).toEqual(['rgb(13,42,82)', 'rgb(28,74,124)', 'rgb(58,112,166)']);
  });
  it('morning and evening differ at sunset height', () => {
    expect(skyColors(0, true)).not.toEqual(skyColors(0, false));
  });
  it('property: always rgb', () => {
    fc.assert(
      fc.property(fc.double({ min: -200, max: 200, noNaN: true }), fc.boolean(), (alt, mo) => {
        for (const s of skyColors(alt, mo)) expect(s).toMatch(RGB);
      }),
    );
  });
});

describe('starsOpacity and horizonGlowOpacity', () => {
  it('stars: clamp((-alt - 4) / 10, 0, 1)', () => {
    expect(starsOpacity(0)).toBe(0);
    expect(starsOpacity(-4)).toBe(0);
    expect(starsOpacity(-9)).toBeCloseTo(0.5, 10);
    expect(starsOpacity(-14)).toBe(1);
    expect(starsOpacity(-60)).toBe(1);
  });
  it('glow: max(0, 1 - |alt| / 16) * 0.85', () => {
    expect(horizonGlowOpacity(0)).toBeCloseTo(0.85, 10);
    expect(horizonGlowOpacity(8)).toBeCloseTo(0.425, 10);
    expect(horizonGlowOpacity(-16)).toBe(0);
    expect(horizonGlowOpacity(40)).toBe(0);
  });
});
