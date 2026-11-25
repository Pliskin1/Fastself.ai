import { WEEKDAYS_SHORT, fromDayNum, longDate, type DayPlan, type Settings } from '@fastself/core';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Body, Caption, GlassCard, SecondaryButton, Text, Title } from '@/components';
import { t } from '@/copy/sr';
import type { FastDay } from '@/db/repo';
import { levelTitle } from '@/features/danas/model';
import { color } from '@/theme/tokens';
import { clockOf, weekBars, type TimerModel } from './model';

export function OffCard() {
  return (
    <GlassCard contentStyle={styles.card} testID="timer-off">
      <Title>{t('tajmer.off.title')}</Title>
      <Body tone="mist">{t('tajmer.off.body')}</Body>
      <SecondaryButton
        testID="btn-enable-if"
        label={t('tajmer.off.cta')}
        onPress={() => router.push('/prakse' as Href)}
      />
    </GlassCard>
  );
}

export function MinorCard() {
  return (
    <GlassCard contentStyle={styles.card} testID="timer-minor">
      <Title>{t('tajmer.minor.title')}</Title>
      <Body tone="mist">{t('tajmer.minor.body')}</Body>
    </GlassCard>
  );
}

function Stat({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <GlassCard style={styles.stat} contentStyle={styles.statInner}>
      <Caption>{label}</Caption>
      <Text variant="bodyStrong" testID={testID}>
        {value}
      </Text>
    </GlassCard>
  );
}

export function Stats({
  model,
  settings,
}: {
  model: TimerModel;
  settings: Settings & { reminders: { ifEnd: boolean } };
}) {
  const none = t('tajmer.stat.none');
  const running = model.startedAt !== null && model.endsAt !== null;
  return (
    <View style={styles.stats}>
      <Stat label={t('tajmer.stat.start')} value={running ? clockOf(model.startedAt!) : none} testID="stat-start" />
      <Stat label={t('tajmer.stat.end')} value={running ? clockOf(model.endsAt!) : none} testID="stat-end" />
      <Stat
        label={t('tajmer.stat.reminder')}
        value={!running ? none : settings.reminders.ifEnd ? clockOf(model.endsAt!) : t('tajmer.reminder.off')}
        testID="stat-reminder"
      />
    </View>
  );
}

export function ResultNote({ text }: { text: string }) {
  return (
    <GlassCard contentStyle={styles.card} testID="timer-result">
      <Body>{text}</Body>
    </GlassCard>
  );
}

export function ComboNote({ plan }: { plan: DayPlan }) {
  if (!plan.orthFast) return null;
  return (
    <Body tone="mist" testID="timer-combo">
      {t('tajmer.combo', { level: levelTitle(plan.level).toLowerCase() })}
    </Body>
  );
}

export function WeekChart({ days, goalHours, today }: { days: FastDay[]; goalHours: number; today: number }) {
  const bars = weekBars(days, goalHours);
  return (
    <GlassCard contentStyle={styles.card} testID="week-chart">
      <Caption>{t('tajmer.week')}</Caption>
      <View style={styles.bars}>
        {bars.map((b) => (
          <View
            key={b.n}
            style={styles.barCol}
            accessible
            accessibilityLabel={t('a11y.weekDay', {
              weekday: WEEKDAYS_SHORT[fromDayNum(b.n).wd] ?? '',
              date: longDate(b.n),
              title: `${b.hours} h`,
            })}
          >
            <View style={styles.track}>
              <View
                testID={`bar-${b.n}`}
                style={[
                  styles.bar,
                  { height: `${Math.max(b.hours > 0 ? 6 : 0, Math.round(b.ratio * 100))}%` },
                  { backgroundColor: b.n === today ? color.sun : 'rgba(246,242,234,0.38)' },
                ]}
              />
            </View>
            <Caption style={styles.barLabel}>{WEEKDAYS_SHORT[fromDayNum(b.n).wd] ?? ''}</Caption>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1 },
  statInner: { padding: 12, gap: 4, alignItems: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, gap: 8 },
  barCol: { flex: 1, height: '100%', alignItems: 'center', gap: 6 },
  track: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 18, borderRadius: 9 },
  barLabel: { textAlign: 'center' },
});
