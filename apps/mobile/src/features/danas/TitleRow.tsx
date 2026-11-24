import type { DayPlan, Settings } from '@fastself/core';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Body, Chip, Display } from '@/components';
import { t } from '@/copy/sr';
import { level as levels } from '@/theme/tokens';

function practiceLabels(settings: Settings): string[] {
  const p = settings.practices;
  const out: string[] = [];
  if (p.orthodox) out.push(t('prakse.orthodox.title'));
  if (p.ramadan) out.push(t('prakse.ramadan.title'));
  if (p.nafila) out.push(t('prakse.nafila.title'));
  if (p.ifOn && !settings.minor) out.push(t('day.if', { plan: t(`prakse.if.${settings.ifPlan}`) }));
  return out;
}

/** Level dot, title, subtitle and the practice chips, which open the practices screen as one button. */
export function TitleRow({ plan, settings }: { plan: DayPlan; settings: Settings }) {
  const lvl = levels[plan.level];
  const labels = practiceLabels(settings);
  return (
    <View style={styles.wrap}>
      <View style={styles.titleLine}>
        <View style={[styles.dot, { backgroundColor: lvl.hex, shadowColor: lvl.hex }]} />
        <Display style={styles.title}>{plan.title}</Display>
      </View>
      <Body tone="mist">{plan.sub}</Body>
      <Pressable
        testID="btn-edit-practices"
        accessibilityRole="button"
        accessibilityLabel={labels.length ? labels.join(', ') : t('day.noPractices')}
        onPress={() => router.push('/prakse' as Href)}
        style={styles.chips}
      >
        {labels.length ? (
          labels.map((label) => <Chip key={label} label={label} />)
        ) : (
          <>
            <Chip label={t('day.noPractices')} />
            <Chip variant="add" label={t('day.noPracticesLink')} onPress={() => router.push('/prakse' as Href)} />
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1 },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
});
