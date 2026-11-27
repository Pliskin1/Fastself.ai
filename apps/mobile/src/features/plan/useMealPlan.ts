import { isoDate, validateRecipe, type DayNum, type DayPlan } from '@fastself/core';
import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { haptics, useToast } from '@/components';
import { t } from '@/copy/sr';
import { consents } from '@/db/repo';
import type { AppSettings } from '@/hooks';
import { mealPlan, type ApiError } from '@/lib/api';
import { buildMealPlanInput, keepValidRecipes, planIsCurrent, type StoredDay } from './model';
import { loadMealPlan, saveMealPlan } from './storage';

const ERROR_KEY: Record<ApiError, string> = {
  offline: 'common.error.network',
  rate_limited: 'plan.meal.error.rate',
  server: 'plan.meal.error.server',
  invalid: 'plan.meal.error.server',
};

/**
 * The navigation object, or null outside a navigator (a bare render in tests). useFocusEffect would throw there.
 * The hook order is the same on every render, because useNavigation reads its context before it throws.
 */
type FocusSource = { addListener: (event: 'focus', callback: () => void) => () => void };

function useOptionalNavigation(): FocusSource | null {
  try {
    return useNavigation() as unknown as FocusSource;
  } catch {
    return null;
  }
}

export interface MealPlanState {
  /** The stored plan while its last day is today or later, else null. */
  days: StoredDay[] | null;
  loading: boolean;
  /** Reads the consent now (not during render) and either runs or asks for it first. */
  make: () => void;
}

/**
 * The meal plan flow. `plans` are the plans from today on (at least 7 are used). The repo is not reactive, so the
 * stored plan is read on mount and every time the screen gets focus again, never in render.
 */
export function useMealPlan(plans: readonly DayPlan[], settings: AppSettings, today: DayNum): MealPlanState {
  const toast = useToast();
  const [stored, setStored] = useState<StoredDay[] | null>(() => loadMealPlan()?.days ?? null);
  const [loading, setLoading] = useState(false);
  const latest = useRef({ plans, settings, toast });
  const pending = useRef(false);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    latest.current = { plans, settings, toast };
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    const { plans: all, settings: s, toast: tst } = latest.current;
    const week = all.slice(0, 7);
    try {
      const result = await mealPlan(buildMealPlanInput(week, s));
      if (!result.ok) {
        tst.show(t(ERROR_KEY[result.error]));
        return;
      }
      const days = keepValidRecipes(result.data, week, s, validateRecipe);
      if (!days.some((d) => d.items.length > 0)) {
        tst.show(t('plan.meal.error.server'));
        return;
      }
      const saved = saveMealPlan(isoDate(week[0]!.n), days);
      haptics.success();
      if (mounted.current) setStored(saved.days);
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  const onFocus = useCallback(() => {
    setStored(loadMealPlan()?.days ?? null);
    // Back from the consent sheet: run the action once if the consent is now on.
    if (pending.current) {
      pending.current = false;
      if (consents.get('ai')) void run();
    }
  }, [run]);
  const navigation = useOptionalNavigation();
  useEffect(() => {
    onFocus();
    return navigation?.addListener('focus', onFocus);
  }, [navigation, onFocus]);

  const make = useCallback(() => {
    if (busy.current) return;
    if (!consents.get('ai')) {
      pending.current = true;
      router.push('/(sheets)/ai-pristanak');
      return;
    }
    void run();
  }, [run]);

  return { days: stored && planIsCurrent(stored, today) ? stored : null, loading, make };
}
