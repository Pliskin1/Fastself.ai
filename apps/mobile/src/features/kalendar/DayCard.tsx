import { HIJRI_MONTHS, MONTHS_GEN, isoDate, julianDate, longDate, type DayPlan, type Settings } from '@fastself/core';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Caption, GlassCard, LinkButton, Pill, Text } from '@/components';
import { t } from '@/copy/sr';
import type { LevelKey } from '@/theme/tokens';
import { levelTitle } from '@/features/danas/model';
import type { CellModel } from './model';

type Props = { cell: CellModel; settings: Settings };

const PLAIN = ['vrijeme', 'filter', 'slava'];

export function DayCard({ cell, settings }: Props) {
  const plan: DayPlan = cell.plan;
  const reasons = plan.orthodox?.reasons ?? [];
  const jul = julianDate(plan.n);
  return (
    <GlassCard contentStyle={styles.card} testID="selected-day-card">
      <Text variant="title">{longDate(plan.n)}</Text>
      {settings.practices.orthodox ? (
        <Caption>{t('kal.julian', { date: `${jul.d}. ${MONTHS_GEN[jul.m - 1]}` })}</Caption>
      ) : null}
      {settings.practices.ramadan || settings.practices.nafila ? (
        <Caption>{t('danas.comp.hijri', { date: `${plan.hijri.d}. ${HIJRI_MONTHS[plan.hijri.m - 1]}` })}</Caption>
      ) : null}
      <Pill level={plan.level} solid label={levelTitle(plan.level)} />
      {reasons.length > 0 ? (
        reasons.map((r, i) => (
          <View key={`${r.label}-${i}`} style={styles.reason}>
            <View style={styles.reasonText}>
              <Text variant="bodyStrong">{r.label}</Text>
              <Caption>{r.sub}</Caption>
            </View>
            {PLAIN.includes(r.level) ? null : <Pill level={r.level as LevelKey} />}
          </View>
        ))
      ) : (
        <View style={styles.reasonText}>
          <Text variant="bodyStrong">{plan.title}</Text>
          <Caption>{plan.sub}</Caption>
        </View>
      )}
      <LinkButton
        testID="btn-report-selected"
        label={t('kal.report')}
        onPress={() =>
          router.push({
            pathname: '/(sheets)/prijava-greske',
            params: { date: isoDate(plan.n), context: 'kalendar' },
          } as Href)
        }
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 10 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reasonText: { flex: 1, gap: 2 },
});
