import { router, type Href } from 'expo-router';
import { updateSettings } from '@/store/settings';
import { nextStep, type Step } from './flow';

export function goNext(step: Step): void {
  const next = nextStep(step);
  if (next) router.push(`/(onboarding)/${next}` as Href);
}

/** Ends onboarding with or without an account and opens Danas. */
export function finishOnboarding(): void {
  updateSettings({ onboarded: true });
  router.replace('/(tabs)/danas' as Href);
}
