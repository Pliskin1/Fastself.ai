import {
  CATEGORY_LABEL,
  forbiddenFor,
  HIJRI_MONTHS,
  isoDate,
  julianDate,
  MONTHS_GEN,
  moonPath,
  moonPhase,
  RULE_PACK_VERSION,
  type Category,
  type DayPlan,
  type Settings,
} from '@fastself/core';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  Body,
  Caption,
  Chip,
  GlassCard,
  LinkButton,
  Pill,
  PrimaryButton,
  SecondaryButton,
  Text,
  Title,
  useToast,
} from '@/components';
import { t } from '@/copy/sr';
import { useUpdateSettings } from '@/hooks';
import { font } from '@/theme/fonts';
import { color } from '@/theme/tokens';
import type { DialModel } from './model';
import { levelTitle, wordFor } from './model';

const YES: Category[] = [
  'povrce',
  'voce',
  'mahunarke',
  'zitarice',
  'orasasto',
  'ulje',
  'riba',
  'mlijecno',
  'jaja',
  'meso',
  'med',
  'vino',
];

export function Legend({ model }: { model: DialModel }) {
  if (!model.legend) return null;
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: 'rgba(158,197,255,0.6)' }]} />
        <Caption>{model.legend.fast}</Caption>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: color.sunCtaBottom }]} />
        <Caption>{model.legend.eat}</Caption>
      </View>
    </View>
  );
}

function Complication({ testID, label, children }: { testID: string; label: string; children: React.ReactNode }) {
  return (
    <GlassCard
      radius={52}
      style={styles.comp}
      contentStyle={styles.compInner}
      testID={testID}
      accessible
      accessibilityLabel={label}
    >
      {children}
    </GlassCard>
  );
}

/** Moon, Julian date and Hijri date as three glass circles. */
export function Complications({ plan }: { plan: DayPlan }) {
  const moon = moonPhase(plan.n);
  const jul = julianDate(plan.n);
  const julianText = `${jul.d}. ${MONTHS_GEN[jul.m - 1]}`;
  const hijriText = `${plan.hijri.d}. ${HIJRI_MONTHS[plan.hijri.m - 1]}`;
  return (
    <View style={styles.comps}>
      <Complication testID="comp-moon" label={t('danas.comp.moon', { phase: moon.name })}>
        <Svg width={40} height={40} viewBox="0 0 40 40">
          <Circle cx={20} cy={20} r={18} fill="rgba(233,238,255,0.10)" />
          <Path d={moonPath(moon.phase, 20, 20, 18)} fill="rgba(233,238,255,0.92)" />
        </Svg>
        <Caption style={styles.compText}>{moon.name}</Caption>
      </Complication>
      <Complication testID="comp-julian" label={t('danas.comp.julian', { date: julianText })}>
        <Text style={styles.compNumber}>{jul.d}</Text>
        <Caption style={styles.compText}>{MONTHS_GEN[jul.m - 1]}</Caption>
      </Complication>
      <Complication testID="comp-hijri" label={t('danas.comp.hijri', { date: hijriText })}>
        <Text style={styles.compNumber}>{plan.hijri.d}</Text>
        <Caption style={styles.compText}>{HIJRI_MONTHS[plan.hijri.m - 1]}</Caption>
      </Complication>
    </View>
  );
}

export function ExceptionCard({ plan, settings }: { plan: DayPlan; settings: Settings }) {
  const update = useUpdateSettings();
  const toast = useToast();
  if (!plan.exception) return null;
  const undo = () => {
    update({
      exceptions: Object.fromEntries(Object.entries(settings.exceptions).filter(([k]) => Number(k) !== plan.n)),
    });
    toast.show(t('exception.undone'));
  };
  return (
    <GlassCard contentStyle={styles.card} testID="exception-card">
      <Title>{t('day.exception', { reason: t(`exception.reason.${plan.exception}`).toLowerCase() })}</Title>
      <Body tone="mist">{t('danas.exception.body')}</Body>
      <SecondaryButton testID="btn-undo-exception" label={t('danas.exception.undo')} onPress={undo} />
    </GlassCard>
  );
}

export function PlateCard({ plan, settings }: { plan: DayPlan; settings: Settings }) {
  const forbidden = forbiddenFor(plan, settings);
  const noKeys = Object.keys(forbidden) as Category[];
  const yes = YES.filter((c) => !forbidden[c]);
  return (
    <GlassCard contentStyle={styles.card} testID="plate-card">
      <Title>{t('danas.plate.title')}</Title>
      {noKeys.length === 0 ? (
        <Body tone="mist">{t('danas.plate.free')}</Body>
      ) : (
        <>
          <Caption>{t('danas.plate.yes')}</Caption>
          <View style={styles.chips}>
            {yes.map((c) => (
              <Chip key={c} variant="yes" label={CATEGORY_LABEL[c]} />
            ))}
          </View>
          <Caption>{t('danas.plate.no')}</Caption>
          <View style={styles.chips}>
            {noKeys.map((c) => {
              const name = CATEGORY_LABEL[c];
              const allergy = forbidden[c]?.src === 'alergija';
              return <Chip key={c} variant="no" label={allergy ? `${name} (${t('danas.plate.allergy')})` : name} />;
            })}
          </View>
        </>
      )}
    </GlassCard>
  );
}

export function Actions({ plan, onToggleWhy }: { plan: DayPlan; onToggleWhy: () => void }) {
  return (
    <View style={styles.actions}>
      <PrimaryButton
        testID="btn-what-to-eat"
        label={t('danas.whatToEat')}
        onPress={() => router.push('/asistent' as Href)}
      />
      <SecondaryButton testID="btn-why" label={t('danas.why', { word: wordFor(plan.level) })} onPress={onToggleWhy} />
    </View>
  );
}

const isFastDay = (plan: DayPlan): boolean =>
  plan.headline === 'orthodox' || plan.headline === 'ramadan' || plan.headline === 'nafila' || plan.headline === 'if';

export function WhyReceipt({ plan }: { plan: DayPlan }) {
  const reasons = plan.orthodox?.reasons ?? [];
  return (
    <GlassCard style={styles.dashed} contentStyle={styles.card} testID="why-receipt">
      {reasons.length > 0 ? (
        reasons.map((r, i) => (
          <View key={`${r.label}-${i}`} style={styles.reason}>
            <View style={styles.reasonText}>
              <Text variant="bodyStrong">{r.label}</Text>
              <Caption>{r.sub}</Caption>
            </View>
            {r.level !== 'vrijeme' && r.level !== 'filter' && r.level !== 'slava' ? <Pill level={r.level} /> : null}
          </View>
        ))
      ) : (
        <View style={styles.reason}>
          <View style={styles.reasonText}>
            <Text variant="bodyStrong">{plan.title}</Text>
            <Caption>{plan.sub}</Caption>
          </View>
        </View>
      )}
      <View style={styles.divider} />
      <View style={styles.reason}>
        <Text variant="bodyStrong" style={styles.reasonText}>
          {t('danas.why.valid')}
        </Text>
        <Pill level={plan.level} solid label={levelTitle(plan.level)} />
      </View>
      <Caption>{t('danas.why.caption', { version: RULE_PACK_VERSION })}</Caption>
      <View style={styles.links}>
        <LinkButton
          testID="btn-report-day"
          label={t('danas.report')}
          onPress={() =>
            router.push({
              pathname: '/(sheets)/prijava-greske',
              params: { date: isoDate(plan.n), context: 'danas' },
            } as Href)
          }
        />
        {isFastDay(plan) ? (
          <LinkButton
            testID="btn-cant-fast"
            label={t('danas.cantFast')}
            onPress={() => router.push('/(sheets)/izuzetak' as Href)}
          />
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  comps: { flexDirection: 'row', justifyContent: 'space-between' },
  comp: { width: 104, height: 104 },
  compInner: { width: 102, height: 102, alignItems: 'center', justifyContent: 'center', gap: 2 },
  compNumber: { fontFamily: font.serif, fontSize: 30, lineHeight: 34, color: color.paper },
  compText: { textAlign: 'center' },
  card: { padding: 16, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { gap: 10 },
  dashed: { borderStyle: 'dashed' },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reasonText: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: color.glassBorder },
  links: { gap: 0 },
});
