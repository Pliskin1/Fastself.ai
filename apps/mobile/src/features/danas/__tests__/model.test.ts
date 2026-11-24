import { dayPlan, localFromEpoch } from '@fastself/core';
import { at, fixtureSettings } from '@/test/utils';
import { dialA11y, dialModel } from '../model';

function modelAt(iso: string, patch: Parameters<typeof fixtureSettings>[0]) {
  const { n, minutes } = localFromEpoch(at(iso));
  const plan = dayPlan(n, fixtureSettings(patch));
  return { plan, model: dialModel(plan, minutes), minutes };
}

describe('dial model', () => {
  it('2.12.2026 16:30, orthodox + IF 16:8 capped to ulje: inside the eating window', () => {
    const { plan, model } = modelAt('2026-12-02T16:30', { orthodox: true, ifOn: true, ifPlan: 16, strictness: 'ulje' });
    expect(plan.title).toBe('Post na ulju');
    expect(model.label).toBe('Prozor za jelo još');
    expect(model.sub).toBe('prozor od 12:00 do 20:00');
    expect(model.targetMin).toBe(20 * 60);
    expect(model.legend).toEqual({ fast: 'post 20:00–12:00', eat: 'jelo 12:00–20:00' });
  });

  it('4.12.2026, orthodox only: riba day without a window shows the word', () => {
    const { plan, model } = modelAt('2026-12-04T16:30', { orthodox: true });
    expect(plan.title).toBe('Riba dozvoljena');
    expect(model.hasWindow).toBe(false);
    expect(model.word).toBe('riba');
    expect(model.targetMin).toBeNull();
  });

  it('8.2.2027 16:30, Ramadan day 1: counting down to iftar', () => {
    const { plan, model } = modelAt('2027-02-08T16:30', { ramadan: true });
    expect(plan.title).toBe('1. ramazan');
    expect(model.label).toBe('Do iftara');
    expect(model.sub).toBe('iftar u 17:06');
    expect(model.targetMin).toBe(17 * 60 + 6);
  });

  it('Ramadan at night counts down to fajr of the next morning', () => {
    const { model } = modelAt('2027-02-08T23:00', { ramadan: true });
    expect(model.label).toBe('Do zore');
    expect(model.sub).toBe('zora u 05:14');
    expect(model.targetMin).toBe(5 * 60 + 14 + 1440);
  });

  it('reads the remaining time aloud with correct plural forms', () => {
    const { model } = modelAt('2027-02-08T16:30', { ramadan: true });
    expect(dialA11y(model, 36)).toBe('Do iftara 0 sati i 36 minuta. iftar u 17:06.');
    expect(dialA11y(model, 61)).toBe('Do iftara 1 sat i 1 minut. iftar u 17:06.');
  });
});
