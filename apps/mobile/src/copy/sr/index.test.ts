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
