import { DEFAULT_SETTINGS, isoDate, localFromEpoch, parseIsoDate } from '@fastself/core';
import { router, type Href } from 'expo-router';
import type { AppSettings } from '@/db/types';
import { resetLocalData, updateSettings } from '@/store/settings';
import { nowMs, setDevClock } from './clock';

// Dev deep link (docs/SCREENS.md §0), used by Maestro and by hand:
//   fastself://dev?reset=1&preset=<id>&date=YYYY-MM-DD&time=HH:MM&tab=<tab>
// Every parameter is optional. It works only in __DEV__ builds.

const NO_PRACTICES = DEFAULT_SETTINGS.practices;

const PRESETS = new Map<string, Partial<AppSettings>>([
  ['orthodox-if', { practices: { ...NO_PRACTICES, orthodox: true, ifOn: true }, ifPlan: 16 }],
  ['orthodox', { practices: { ...NO_PRACTICES, orthodox: true } }],
  ['ramadan-nafila', { practices: { ...NO_PRACTICES, ramadan: true, nafila: true } }],
  ['ramadan-if', { practices: { ...NO_PRACTICES, ramadan: true, ifOn: true }, ifPlan: 16 }],
  ['if14', { practices: { ...NO_PRACTICES, ifOn: true }, ifPlan: 14 }],
]);

const TABS = ['danas', 'kalendar', 'plan', 'tajmer', 'profil'] as const;

const DEV_LINK = /(^[a-z][a-z0-9+.-]*:\/\/\/?|\/)dev\/?(\?|#|$)/i;

function parseQuery(url: string): Map<string, string> {
  const params = new Map<string, string>();
  const query = url.split('#')[0]?.split('?')[1] ?? '';
  for (const pair of query.split('&')) {
    const [key, ...rest] = pair.split('=');
    if (!key) continue;
    try {
      params.set(decodeURIComponent(key), decodeURIComponent(rest.join('=').replace(/\+/g, ' ')));
    } catch {
      // Skip a parameter that is not valid percent-encoding.
    }
  }
  return params;
}

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Applies a `fastself://dev?...` link: reset, preset, dev date and time, then the tab. Anything that is not a dev
 * link, and any parameter that does not parse, is ignored. Does nothing in production builds.
 */
export async function applyDevLink(url: string): Promise<void> {
  if (!__DEV__ || !DEV_LINK.test(url)) return;
  const params = parseQuery(url);

  const reset = params.get('reset') === '1';
  if (reset) resetLocalData();

  // A preset is a complete known state: defaults (city Podgorica, no allergies) plus its practices, onboarded.
  const preset = PRESETS.get(params.get('preset') ?? '');
  if (preset) updateSettings({ ...DEFAULT_SETTINGS, ...preset, onboarded: true });

  const date = params.get('date');
  const time = params.get('time');
  if (date !== undefined || time !== undefined) {
    const current = localFromEpoch(nowMs());
    const n = date === undefined ? current.n : parseIsoDate(date);
    const clock = /^(\d{1,2}):(\d{2})$/.exec(
      time ?? `${pad(Math.floor(current.minutes / 60))}:${pad(current.minutes % 60)}`,
    );
    if (n !== null && clock) setDevClock(`${isoDate(n)}T${pad(Number(clock[1]))}:${clock[2]}`);
  }

  const tab = TABS.find((name) => name === params.get('tab'));
  if (tab) router.replace(`/(tabs)/${tab}` as Href);
  // After a reset or a preset the start route decides again between onboarding and the tabs.
  else if (reset || preset) router.replace('/' as Href);
}
