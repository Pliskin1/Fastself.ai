import { epochFromLocal, parseIsoDate } from '@fastself/core';
import { AppState } from 'react-native';

// The one clock of the app. Everything that needs "now" asks nowMs(), so the dev clock moves the whole app.
let offsetMs = 0;
let frozenAt: number | null = null;

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let appState: { remove(): void } | null = null;

/** Current time as epoch ms. In __DEV__ it follows the dev clock. */
export function nowMs(): number {
  return frozenAt ?? Date.now() + offsetMs;
}

function emit(): void {
  for (const listener of [...listeners]) listener();
}

/** (Re)starts the tick. It fires on the second, so a seconds display never skips or repeats a value. */
function arm(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  if (listeners.size === 0 || frozenAt !== null) return;
  timer = setTimeout(
    () => {
      timer = null;
      emit();
      arm();
    },
    1000 - (nowMs() % 1000),
  );
}

/** Calls the listener about once a second, when the app returns to the foreground and when the clock is set. */
export function subscribeClock(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      emit();
      arm();
    });
    arm();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    appState?.remove();
    appState = null;
    arm();
  };
}

/** Epoch ms of a Podgorica local time written as `YYYY-MM-DDTHH:MM` (seconds optional); null if it is not one. */
export function parseIsoLocal(isoLocal: string): number | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(isoLocal);
  if (!match) return null;
  const n = parseIsoDate(match[1] ?? '');
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  const seconds = Number(match[4] ?? 0);
  if (n === null || hours > 23 || minutes > 59 || seconds > 59) return null;
  return epochFromLocal(n, hours * 60 + minutes) + seconds * 1000;
}

/**
 * Dev tool: sets the app clock to a Podgorica local time (`YYYY-MM-DDTHH:MM`); it keeps ticking from there.
 * Pass null to return to the real time. An invalid value changes nothing. Does nothing in production builds.
 */
export function setDevClock(isoLocal: string | null): void {
  if (!__DEV__) return;
  if (isoLocal === null) {
    offsetMs = 0;
  } else {
    const target = parseIsoLocal(isoLocal);
    if (target === null) return;
    offsetMs = target - Date.now();
  }
  frozenAt = null;
  emit();
  arm();
}

/** Tests: stops the clock at an instant, so nothing ticks on its own. Pass null to let it run again. */
export function freezeClock(epochMs: number | null): void {
  if (!__DEV__) return;
  frozenAt = epochMs;
  emit();
  arm();
}
