import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Display, ScreenScroll, Segmented } from '@/components';
import { t } from '@/copy/sr';
import { useRange, useSettings, useToday } from '@/hooks';
import { flags } from './flags';
import { MealCard } from './MealCard';
import { mealsByDate, rowModels, summaryItems, type RangeDays } from './model';
import { SummaryCard } from './SummaryCard';
import { Timeline } from './Timeline';
import { useMealPlan } from './useMealPlan';

export function PlanScreen() {
  const [range, setRange] = useState<RangeDays>(7);
  const today = useToday();
  const settings = useSettings();
  const { plans, stats } = useRange(today, range);
  const meal = useMealPlan(plans, settings, today);

  const items = useMemo(() => summaryItems(stats), [stats]);
  // With the flag off nothing of the meal plan shows, not even a plan stored earlier.
  const mealDays = flags.mealPlan ? meal.days : null;
  const rows = useMemo(
    () => rowModels(plans, settings, mealDays ? mealsByDate(mealDays) : {}),
    [plans, settings, mealDays],
  );

  return (
    <ScreenScroll sky testID="screen-plan" bottomInset={80}>
      <View style={styles.header}>
        <Display style={styles.title}>{t('plan.title')}</Display>
        <View style={styles.range}>
          <Segmented
            testID="seg-range"
            items={[
              { key: '7', label: t('plan.range.7') },
              { key: '30', label: t('plan.range.30') },
            ]}
            value={String(range)}
            onChange={(key) => setRange(key === '30' ? 30 : 7)}
          />
        </View>
      </View>
      <SummaryCard range={range} items={items} />
      {flags.mealPlan ? <MealCard range={range} meal={meal} /> : null}
      <Timeline rows={rows} />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  // Title left, range right, as in the prototype. The range drops below the title when large text needs the room.
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  title: { flexShrink: 1 },
  range: { width: 184 },
});
