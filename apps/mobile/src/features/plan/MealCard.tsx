import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Body, Caption, GlassCard, PrimaryButton, SecondaryButton, Title } from '@/components';
import { t } from '@/copy/sr';
import { color } from '@/theme/tokens';
import type { RangeDays } from './model';
import type { MealPlanState } from './useMealPlan';

type Props = { range: RangeDays; meal: MealPlanState };

export function MealCard({ range, meal }: Props) {
  const hasPlan = meal.days !== null;
  return (
    <GlassCard testID="plan-meal-card" contentStyle={styles.card}>
      <Title>{t('plan.meal.title')}</Title>
      <Body tone={hasPlan ? 'paper' : 'mist'} style={hasPlan ? styles.done : undefined}>
        {t(hasPlan ? 'plan.meal.done' : 'plan.meal.body')}
      </Body>
      {range === 30 ? <Caption>{t('plan.meal.weekOnly')}</Caption> : null}
      {meal.loading ? (
        <View
          testID="plan-meal-loading"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('plan.meal.loading')}
          accessibilityLiveRegion="polite"
          style={styles.loading}
        >
          <ActivityIndicator color={color.sun} />
          <Body tone="mist">{t('plan.meal.loading')}</Body>
        </View>
      ) : (
        <View style={styles.buttons}>
          <SecondaryButton
            testID="btn-make-meal-plan"
            label={t(hasPlan ? 'plan.meal.remake' : 'plan.meal.make')}
            onPress={meal.make}
          />
          {hasPlan ? (
            <PrimaryButton
              testID="btn-shopping"
              label={t('plan.shopping')}
              onPress={() => router.push('/(sheets)/kupovina')}
            />
          ) : null}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, gap: 10 },
  done: { color: color.tealInk },
  buttons: { gap: 8, marginTop: 4 },
  loading: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
