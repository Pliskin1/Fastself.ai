import { pl, t } from './index';

describe('copy', () => {
  it('returns text and the key for unknown strings', () => {
    expect(t('common.next')).toBe('Nastavi');
    expect(t('nope.missing')).toBe('nope.missing');
  });

  it('wires pl', () => {
    expect(pl(3, ['dan', 'dana', 'dana'])).toBe('dana');
  });
});

describe('shipped copy (TESTING §10 gate 4)', () => {
  const modules = [
    'asistent',
    'brisanje',
    'common',
    'danas',
    'kalendar',
    'legal',
    'nalog',
    'nav',
    'notif',
    'onboarding',
    'plan',
    'profil',
    'report',
    'tajmer',
  ];
  const all: [string, string][] = modules.flatMap((m) =>
    Object.entries((jest.requireActual(`./${m}`) as { default: Record<string, string> }).default),
  );

  it.each(all)('%s has no placeholder', (_key, text) => {
    expect(text).not.toMatch(/\[|\]|TODO|lorem|POPUNI|TBD|uskoro/i);
  });
});
