import type { DayNum, MoonPhase } from '../types';

const SYNODIC = 29.530588853;
const NEW_MOON_JD = 2451550.26;

/** Moon phase at local noon of day n. phase 0..1 (0 = new), illumination 0..1. */
export function moonPhase(n: DayNum): MoonPhase {
  const jd = 2440587.5 + n + 0.5;
  const age = (((jd - NEW_MOON_JD) % SYNODIC) + SYNODIC) % SYNODIC;
  const phase = age / SYNODIC;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const name =
    age < 1.84
      ? 'mladi mjesec'
      : age < 5.53
        ? 'rastući srp'
        : age < 9.22
          ? 'prva četvrt'
          : age < 12.91
            ? 'rastući mjesec'
            : age < 16.61
              ? 'pun mjesec'
              : age < 20.3
                ? 'opadajući mjesec'
                : age < 23.99
                  ? 'posljednja četvrt'
                  : age < 27.68
                    ? 'opadajući srp'
                    : 'mladi mjesec';
  return { phase, illumination, name };
}

/** SVG path of the lit part of the moon disc. */
export function moonPath(phase: number, cx: number, cy: number, r: number): string {
  const t = Math.cos(2 * Math.PI * phase);
  const rx = Math.max(0.01, Math.abs(t) * r);
  const top = `${cx} ${cy - r}`;
  const bot = `${cx} ${cy + r}`;
  if (phase < 0.5) {
    return `M ${top} A ${r} ${r} 0 0 1 ${bot} A ${rx.toFixed(2)} ${r} 0 0 ${t > 0 ? 0 : 1} ${top} Z`;
  }
  return `M ${top} A ${r} ${r} 0 0 0 ${bot} A ${rx.toFixed(2)} ${r} 0 0 ${t < 0 ? 0 : 1} ${top} Z`;
}
