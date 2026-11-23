import type { SkyColors } from '../types';

type Stop = readonly [number, readonly [string, string, string]];

const SKY_M: readonly Stop[] = [
  [-90, ['#03040D', '#080B22', '#101533']],
  [-18, ['#03040D', '#080B22', '#101533']],
  [-12, ['#05071A', '#111640', '#2A2558']],
  [-6, ['#0A1035', '#2C2A66', '#7A4C78']],
  [0, ['#13245A', '#4D4C8A', '#D98A7C']],
  [6, ['#183466', '#4F6A9E', '#E0A983']],
  [15, ['#0D2A52', '#1C4A7C', '#3A70A6']],
  [90, ['#0D2A52', '#1C4A7C', '#3A70A6']],
];
const SKY_E: readonly Stop[] = [
  [-90, ['#03040D', '#080B22', '#101533']],
  [-18, ['#03040D', '#080B22', '#101533']],
  [-12, ['#05061A', '#141239', '#33204F']],
  [-6, ['#090C2E', '#2E1F58', '#843B63']],
  [0, ['#121B4C', '#55337A', '#E07E5B']],
  [6, ['#1A2D5E', '#644A84', '#E59A5E']],
  [15, ['#0D2A52', '#1C4A7C', '#3A70A6']],
  [90, ['#0D2A52', '#1C4A7C', '#3A70A6']],
];

const hexRgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const rgb = (c: readonly number[]): string => `rgb(${c[0]},${c[1]},${c[2]})`;

function mix(a: string, b: string, t: number): string {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return rgb(A.map((v, i) => Math.round(v + ((B[i] ?? 0) - v) * t)));
}

/** Sky gradient (top, mid, bottom) for a sun altitude. Always rgb() strings. */
export function skyColors(alt: number, morning: boolean): SkyColors {
  const T = morning ? SKY_M : SKY_E;
  for (let i = 0; i < T.length - 1; i++) {
    const a = T[i]!;
    const b = T[i + 1]!;
    if (alt <= b[0]) {
      const t = Math.max(0, Math.min(1, (alt - a[0]) / (b[0] - a[0])));
      return [mix(a[1][0], b[1][0], t), mix(a[1][1], b[1][1], t), mix(a[1][2], b[1][2], t)];
    }
  }
  const last = T[T.length - 1]![1];
  return [rgb(hexRgb(last[0])), rgb(hexRgb(last[1])), rgb(hexRgb(last[2]))];
}

/** clamp((-alt - 4) / 10, 0, 1) */
export function starsOpacity(alt: number): number {
  return Math.max(0, Math.min(1, (-alt - 4) / 10));
}

/** max(0, 1 - |alt| / 16) * 0.85 */
export function horizonGlowOpacity(alt: number): number {
  return Math.max(0, 1 - Math.abs(alt) / 16) * 0.85;
}
