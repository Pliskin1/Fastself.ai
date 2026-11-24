import { ALLERGENS, type AllergenId, type Practices, type Settings } from '@fastself/core';

export const STEPS = ['welcome', 'prakse', 'alergije', 'sigurnost', 'dozvole', 'nalog'] as const;
export type Step = (typeof STEPS)[number];

export const TOTAL_STEPS = 5;

/** 1..5 for the five numbered steps, null on welcome. */
export function stepNumber(step: Step): number | null {
  const index = STEPS.indexOf(step);
  return index > 0 ? index : null;
}

export function nextStep(step: Step): Step | null {
  return STEPS[STEPS.indexOf(step) + 1] ?? null;
}

export function prevStep(step: Step): Step | null {
  return STEPS[STEPS.indexOf(step) - 1] ?? null;
}

export function stepFromSegment(segment: string | undefined): Step | null {
  return STEPS.find((s) => s === segment) ?? null;
}

type FlowSettings = Pick<Settings, 'practices' | 'minor'>;

export function hasPractice(practices: Practices): boolean {
  return practices.orthodox || practices.ramadan || practices.nafila || practices.ifOn;
}

/** Only the practices step blocks "Nastavi". Every other step can always continue. */
export function canContinue(step: Step, settings: FlowSettings): boolean {
  return step === 'prakse' ? hasPractice(settings.practices) : true;
}

export function togglePractice(practices: Practices, key: keyof Practices, minor: boolean): Practices {
  if (key === 'ifOn' && minor) return { ...practices, ifOn: false };
  return { ...practices, [key]: !practices[key] };
}

/** Intermittent fasting is not offered to minors: switching "minor" on switches IF off. */
export function minorPatch(on: boolean, practices: Practices): Pick<Settings, 'minor' | 'practices'> {
  return { minor: on, practices: on ? { ...practices, ifOn: false } : practices };
}

const fold = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase();

type AllergyState = Pick<Settings, 'allergies' | 'customAvoid'>;

/**
 * Adds what the user typed. A word that matches an EU allergen name (ignoring case and diacritics) adds that allergen,
 * anything else is kept as a custom word in lower case. Duplicates and empty input change nothing.
 */
export function addAllergyInput(state: AllergyState, input: string): AllergyState {
  const word = input.trim().replace(/\s+/g, ' ');
  if (!word) return state;
  const key = fold(word);
  const match = ALLERGENS.find((a) => fold(a.name) === key || a.id === key);
  if (match) {
    return state.allergies.includes(match.id) ? state : { ...state, allergies: [...state.allergies, match.id] };
  }
  const custom = word.toLowerCase();
  if (state.customAvoid.some((c) => fold(c) === key)) return state;
  return { ...state, customAvoid: [...state.customAvoid, custom] };
}

export function addAllergen(state: AllergyState, id: AllergenId): AllergyState {
  return state.allergies.includes(id) ? state : { ...state, allergies: [...state.allergies, id] };
}

export function removeAllergen(state: AllergyState, id: AllergenId): AllergyState {
  return { ...state, allergies: state.allergies.filter((a) => a !== id) };
}

export function removeCustom(state: AllergyState, word: string): AllergyState {
  return { ...state, customAvoid: state.customAvoid.filter((c) => c !== word) };
}

export function allergyCount(state: AllergyState): number {
  return state.allergies.length + state.customAvoid.length;
}

type Diets = Settings['diets'];

/** Vegetarian and vegan exclude each other. Halal is independent. */
export function toggleDiet(diets: Diets, key: keyof Diets): Diets {
  const on = !diets[key];
  if (key === 'vegan') return { ...diets, vegan: on, vegetarian: on ? false : diets.vegetarian };
  if (key === 'vegetarian') return { ...diets, vegetarian: on, vegan: on ? false : diets.vegan };
  return { ...diets, halal: on };
}

/** Chip id used in testIDs: the allergen id, or the lowercased custom word. */
export const customChipId = (word: string): string => word.toLowerCase().replace(/\s+/g, '-');
