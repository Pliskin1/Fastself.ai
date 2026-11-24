import {
  CITIES,
  formatHm,
  longDate,
  nextSlava,
  pl,
  ramadanCountdown,
  WEEKDAYS_SHORT,
  type DayNum,
  type DayPlan,
  type Settings,
} from '@fastself/core';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Body, Caption, GlassCard, LinkButton, Pill, PrimaryButton, SecondaryButton, Text, Title } from '@/components';
import { t } from '@/copy/sr';
import { useRange, useUpdateSettings } from '@/hooks';
import { font } from '@/theme/fonts';
import { color, level as levels } from '@/theme/tokens';
import { levelTitle, wordFor } from './model';

const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const SEHUR_LEAD_MIN = 30;

export function RamadanCard({ plan }: { plan: DayPlan }) {
  const ram = plan.ramadan;
  if (!ram || plan.ramadanDay === 0) return null;
  const dots = Array.from({ length: ram.length }, (_, i) => {
    const day = ram.start + i;
    const isToday = day === plan.n;
    const kind = ram.exceptionDays.includes(day) ? 'exception' : day < plan.n ? 'past' : isToday ? 'today' : 'future';
    return { i, kind, qadr: i === 26 };
  });
  return (
    <GlassCard contentStyle={styles.card} testID="ramadan-card">
      <View style={styles.row}>
        <Title>{t('day.ramadan')}</Title>
        <Caption>{t('danas.ramadan.day', { n: ram.day })}</Caption>
      </View>
      <View style={styles.grid}>
        {dots.map((d) => (
          <View
            key={d.i}
            style={[
              styles.dot,
              d.kind === 'past' && { backgroundColor: color.sun },
              d.kind === 'exception' && { backgroundColor: color.ember },
              d.kind === 'today' && styles.dotToday,
              d.kind === 'future' && { backgroundColor: 'rgba(255,255,255,0.14)' },
              d.qadr && styles.dotQadr,
            ]}
          />
        ))}
      </View>
      <Body tone="mist">
        {ram.kazaCount === 0 ? t('danas.ramadan.kazaNone') : t('danas.ramadan.kaza', { n: ram.kazaCount })}
      </Body>
      <Caption>{t('danas.ramadan.qadr', { date: longDate(ram.qadr) })}</Caption>
      <Caption>{t('danas.ramadan.bajram', { date: longDate(ram.bajram) })}</Caption>
    </GlassCard>
  );
}

export function VaktijaCard({ plan, settings }: { plan: DayPlan; settings: Settings }) {
  if (!plan.times || !(plan.ramadanDay > 0 || plan.nafilaFast)) return null;
  const times = plan.times;
  return (
    <GlassCard contentStyle={styles.card} testID="vaktija-card">
      <View style={styles.row}>
        <Title>{t('danas.vaktija.title', { city: CITIES[settings.city].name })}</Title>
        <LinkButton
          testID="btn-vaktija-adjust"
          label={t('danas.vaktija.adjust')}
          onPress={() => router.push('/vaktija' as Href)}
        />
      </View>
      <View style={styles.cells}>
        {PRAYERS.map((key) => {
          const hot = key === 'fajr' || key === 'maghrib';
          return (
            <View key={key} style={[styles.cell, hot && styles.cellHot]}>
              <Caption style={hot && { color: color.sun }}>{t(`prayer.${key}`)}</Caption>
              <Text variant="bodyStrong">{formatHm(times[key])}</Text>
            </View>
          );
        })}
      </View>
      <Caption>{t('danas.vaktija.caption', { time: formatHm(times.fajr - SEHUR_LEAD_MIN) })}</Caption>
    </GlassCard>
  );
}

export function NafilaCard({ plan, settings }: { plan: DayPlan; settings: Settings }) {
  const update = useUpdateSettings();
  if (!plan.nafila || plan.ramadanDay > 0 || !settings.practices.nafila) return null;
  const set = (on: boolean) => {
    const days = Object.fromEntries(Object.entries(settings.nafilaDays).filter(([k]) => Number(k) !== plan.n));
    update({ nafilaDays: on ? { ...days, [plan.n]: true } : days });
  };
  return (
    <GlassCard contentStyle={styles.card} testID="nafila-card">
      <Title>{t('danas.nafila.title')}</Title>
      <Body tone="mist">{plan.nafila}</Body>
      {plan.nafilaFast ? (
        <SecondaryButton testID="btn-nafila-off" label={t('danas.nafila.off')} onPress={() => set(false)} />
      ) : (
        <PrimaryButton testID="btn-nafila-on" label={t('danas.nafila.on')} onPress={() => set(true)} />
      )}
    </GlassCard>
  );
}

export function RamadanCountdown({ plan, settings }: { plan: DayPlan; settings: Settings }) {
  if (!settings.practices.ramadan || plan.ramadanDay > 0) return null;
  const c = ramadanCountdown(plan.n, settings);
  if (!c) return null;
  return (
    <GlassCard contentStyle={[styles.card, styles.center]} testID="ramadan-countdown">
      <Text style={styles.big}>{c.days}</Text>
      <Body>{t('danas.countdown.days', { word: pl(c.days, ['dan', 'dana', 'dana']) })}</Body>
      <Caption>{longDate(c.start)}</Caption>
      <Caption style={styles.centerText}>{t('danas.countdown.note')}</Caption>
    </GlassCard>
  );
}

export function SlavaCard({ today, settings }: { today: DayNum; settings: Settings }) {
  const slava = nextSlava(today, settings.slavaId, settings);
  if (!settings.practices.orthodox || !slava || slava.daysUntil > 60) return null;
  const when =
    slava.daysUntil === 0
      ? t('danas.slava.today')
      : slava.daysUntil === 1
        ? t('danas.slava.tomorrow')
        : t('danas.slava.in', { n: slava.daysUntil, word: pl(slava.daysUntil, ['dan', 'dana', 'dana']) });
  return (
    <GlassCard contentStyle={styles.card} testID="slava-card">
      <Caption>{when}</Caption>
      <Text style={styles.slavaName}>{slava.name}</Text>
      <Caption>{longDate(slava.n)}</Caption>
      {slava.posna ? <Pill level={slava.level} label={levelTitle(slava.level)} /> : null}
      <Body tone="mist">
        {slava.posna ? t('danas.slava.fast', { level: levelTitle(slava.level) }) : t('danas.slava.meat')}
      </Body>
    </GlassCard>
  );
}

export function WeekStrip({ today }: { today: DayNum }) {
  const { plans } = useRange(today, 7);
  return (
    <View style={styles.week}>
      <Caption>{t('danas.week')}</Caption>
      <View style={styles.capsules}>
        {plans.map((p, i) => {
          const lvl = levels[p.level];
          const isToday = p.n === today;
          return (
            <View
              key={p.n}
              accessible
              accessibilityLabel={t('a11y.weekDay', {
                weekday: WEEKDAYS_SHORT[p.date.wd] ?? '',
                date: longDate(p.n),
                title: p.title,
              })}
              style={[
                styles.capsule,
                { backgroundColor: p.level === 'mrsno' ? 'rgba(255,255,255,0.08)' : `rgba(${lvl.rgb},0.24)` },
                isToday && styles.capsuleToday,
              ]}
            >
              <Caption style={styles.capText}>
                {i === 0 ? t('common.today') : (WEEKDAYS_SHORT[p.date.wd] ?? '')}
              </Caption>
              <Text style={styles.capNumber}>{p.date.d}</Text>
              <Caption style={styles.capText}>{wordFor(p.level)}</Caption>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 10 },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dot: { width: 20, height: 20, borderRadius: 10 },
  dotToday: {
    backgroundColor: '#FFF1CC',
    shadowColor: color.sun,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  dotQadr: { borderWidth: 1.5, borderColor: color.paper },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '31%', padding: 10, borderRadius: 14, backgroundColor: color.glassFill, gap: 2 },
  cellHot: { backgroundColor: 'rgba(255,200,110,0.14)' },
  big: { fontFamily: font.serif, fontSize: 64, lineHeight: 68, color: color.paper },
  slavaName: { fontFamily: font.serifMedium, fontSize: 26, lineHeight: 30, color: color.paper },
  week: { gap: 8 },
  capsules: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  capsule: {
    flex: 1,
    minHeight: 92,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  capsuleToday: { borderWidth: 1.5, borderColor: color.paper },
  capText: { textAlign: 'center', fontSize: 11, lineHeight: 14 },
  capNumber: { fontFamily: font.serif, fontSize: 24, lineHeight: 28, color: color.paper },
});
