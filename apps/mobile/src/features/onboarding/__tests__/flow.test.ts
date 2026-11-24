import { DEFAULT_SETTINGS } from '@fastself/core';
import {
  addAllergyInput,
  allergyCount,
  canContinue,
  minorPatch,
  nextStep,
  prevStep,
  removeAllergen,
  stepNumber,
  STEPS,
  toggleDiet,
  togglePractice,
} from '../flow';

const empty = { allergies: [], customAvoid: [] };
const noPractices = DEFAULT_SETTINGS.practices;

describe('onboarding flow', () => {
  it('numbers the five steps and leaves welcome unnumbered', () => {
    expect(STEPS.map(stepNumber)).toEqual([null, 1, 2, 3, 4, 5]);
  });

  it('walks forward and back and stops at the ends', () => {
    expect(nextStep('welcome')).toBe('prakse');
    expect(nextStep('dozvole')).toBe('nalog');
    expect(nextStep('nalog')).toBeNull();
    expect(prevStep('prakse')).toBe('welcome');
    expect(prevStep('welcome')).toBeNull();
  });

  it('blocks only the practices step until one practice is chosen', () => {
    expect(canContinue('prakse', { practices: noPractices, minor: false })).toBe(false);
    expect(canContinue('prakse', { practices: { ...noPractices, nafila: true }, minor: false })).toBe(true);
    expect(canContinue('alergije', { practices: noPractices, minor: false })).toBe(true);
    expect(canContinue('dozvole', { practices: noPractices, minor: false })).toBe(true);
  });

  it('switches IF off when minor is turned on and refuses IF while minor', () => {
    const withIf = { ...noPractices, orthodox: true, ifOn: true };
    expect(minorPatch(true, withIf)).toEqual({ minor: true, practices: { ...withIf, ifOn: false } });
    expect(minorPatch(false, withIf).practices.ifOn).toBe(true);
    expect(togglePractice(noPractices, 'ifOn', true).ifOn).toBe(false);
    expect(togglePractice(noPractices, 'ifOn', false).ifOn).toBe(true);
    expect(togglePractice(noPractices, 'orthodox', true).orthodox).toBe(true);
  });

  it('adds a typed EU allergen name as the allergen, ignoring case and diacritics', () => {
    expect(addAllergyInput(empty, 'MEKUŠCI').allergies).toEqual(['mekusci']);
    expect(addAllergyInput(empty, 'mlijeko i laktoza').allergies).toEqual(['mlijecno']);
  });

  it('keeps other words as lower-case custom entries without duplicates', () => {
    const once = addAllergyInput(empty, ' Kivi ');
    expect(once.customAvoid).toEqual(['kivi']);
    expect(addAllergyInput(once, 'KIVI')).toBe(once);
    expect(addAllergyInput(empty, '   ')).toBe(empty);
    expect(allergyCount(addAllergyInput(addAllergyInput(empty, 'kivi'), 'jaja'))).toBe(2);
  });

  it('removes an allergen', () => {
    expect(removeAllergen({ allergies: ['jaja', 'soja'], customAvoid: [] }, 'jaja').allergies).toEqual(['soja']);
  });

  it('keeps vegetarian and vegan mutually exclusive and halal independent', () => {
    const veg = toggleDiet(DEFAULT_SETTINGS.diets, 'vegetarian');
    expect(veg).toMatchObject({ vegetarian: true, vegan: false });
    const vegan = toggleDiet(veg, 'vegan');
    expect(vegan).toMatchObject({ vegetarian: false, vegan: true });
    expect(toggleDiet(vegan, 'halal')).toMatchObject({ vegan: true, halal: true });
  });
});
