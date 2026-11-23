export type SkyColors = { top: string; mid: string; bottom: string; glow: number; stars: number };

type Key = { alt: number; top: string; mid: string; bottom: string; glow: number; stars: number };

const KEYS: Key[] = [
  { alt: -18, top: '#03040D', mid: '#080B24', bottom: '#111A3F', glow: 0.05, stars: 1 },
  { alt: -6, top: '#080B24', mid: '#1B1F52', bottom: '#4A3F7A', glow: 0.35, stars: 0.6 },
  { alt: 0, top: '#1A2058', mid: '#5A4A86', bottom: '#F08F6A', glow: 0.7, stars: 0.2 },
  { alt: 12, top: '#2C4C95', mid: '#6F8FC9', bottom: '#F4C48C', glow: 0.45, stars: 0 },
  { alt: 40, top: '#2A56A8', mid: '#4F86D0', bottom: '#9CC4EE', glow: 0.2, stars: 0 },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${c(ar, br)},${c(ag, bg)},${c(ab, bb)})`;
}

/** Local fallback until @fastself/core/sky lands (T2). Same signature intent: altitude in degrees. */
export function skyColors(altitude: number): SkyColors {
  const first = KEYS[0] as Key;
  const last = KEYS[KEYS.length - 1] as Key;
  if (altitude <= first.alt) return first;
  if (altitude >= last.alt) return last;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i] as Key;
    const b = KEYS[i + 1] as Key;
    if (altitude >= a.alt && altitude <= b.alt) {
      const t = (altitude - a.alt) / (b.alt - a.alt);
      return {
        top: mix(a.top, b.top, t),
        mid: mix(a.mid, b.mid, t),
        bottom: mix(a.bottom, b.bottom, t),
        glow: a.glow + (b.glow - a.glow) * t,
        stars: a.stars + (b.stars - a.stars) * t,
      };
    }
  }
  return last;
}

/** Rough sun altitude for a local hour (0-24). Replaced by core sunAltitude(date, hour, city) in T2. */
export function sunAltitude(hour: number): number {
  return 48 * Math.sin(((hour - 6) / 24) * 2 * Math.PI) - 8;
}

export const moonPath = 'M30 6 A24 24 0 1 0 30 54 A18 18 0 1 1 30 6 Z';
