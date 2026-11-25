import { OFFSET_LIMIT, signed, stepOffset, stepShift } from '../model';

describe('profil model', () => {
  it('offsets stay within the limit', () => {
    let o = { fajr: 0, maghrib: 0 };
    for (let i = 0; i < 40; i++) o = stepOffset(o, 'fajr', 1);
    expect(o).toEqual({ fajr: OFFSET_LIMIT, maghrib: 0 });
    for (let i = 0; i < 80; i++) o = stepOffset(o, 'maghrib', -1);
    expect(o.maghrib).toBe(-OFFSET_LIMIT);
  });

  it('ramadan shift is limited to one day each way', () => {
    expect(stepShift(1, 1)).toBe(1);
    expect(stepShift(0, -1)).toBe(-1);
    expect(stepShift(-1, -1)).toBe(-1);
  });

  it('signs offsets', () => {
    expect([signed(3), signed(0), signed(-2)]).toEqual(['+3', '0', '-2']);
  });
});
