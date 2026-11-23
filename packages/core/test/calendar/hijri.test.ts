import { describe, expect, it } from 'vitest';
import { parseIsoDate, tabularHijri } from '../../src/index';
import { HIJRI_GOLDEN } from '../golden/hijri';

describe('tabularHijri', () => {
  it.each(HIJRI_GOLDEN)('%s -> %i/%i/%i (shift %i)', (iso, y, m, d, shift) => {
    expect(tabularHijri(parseIsoDate(iso)!, shift)).toEqual({ y, m, d });
  });
  it('default shift is 0', () => {
    const n = parseIsoDate('2027-02-08')!;
    expect(tabularHijri(n)).toEqual(tabularHijri(n, 0));
  });
});
