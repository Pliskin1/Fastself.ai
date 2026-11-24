import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Body, GlassCard, Switch, Title } from '@/components';
import { t } from '@/copy/sr';
import { safety, type SafetyKey } from '@/db/repo/safety';
import { goNext, minorPatch, OnboardingScreen } from '@/features/onboarding';
import { useSettings, useUpdateSettings } from '@/hooks';

const ROWS: { key: SafetyKey; testID: string }[] = [
  { key: 'preg', testID: 'sw-preg' },
  { key: 'diab', testID: 'sw-diab' },
  { key: 'ed', testID: 'sw-ed' },
  { key: 'minor', testID: 'sw-minor' },
];

export default function ObSigurnostScreen() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const [local, setLocal] = useState(() => safety.all());
  const value = (key: SafetyKey) => (key === 'minor' ? settings.minor : local[key]);
  const anyOn = ROWS.some((r) => value(r.key));

  const change = (key: SafetyKey, on: boolean) => {
    if (key === 'minor') {
      update(minorPatch(on, settings.practices));
      return;
    }
    safety.set(key, on);
    setLocal((prev) => ({ ...prev, [key]: on }));
  };

  return (
    <OnboardingScreen
      testID="screen-ob-sigurnost"
      title={t('sigurnost.title')}
      sub={t('sigurnost.sub')}
      cta={t('sigurnost.cta')}
      onNext={() => goNext('sigurnost')}
    >
      <GlassCard contentStyle={styles.rows}>
        {ROWS.map(({ key, testID }) => (
          <View key={key} style={styles.row}>
            <Body style={styles.flex}>{t(`sigurnost.${key}`)}</Body>
            <Switch
              testID={testID}
              accessibilityLabel={t(`sigurnost.${key}`)}
              value={value(key)}
              onValueChange={(on) => change(key, on)}
            />
          </View>
        ))}
      </GlassCard>
      {anyOn ? <Body tone="mist">{t(settings.minor ? 'sigurnost.note.minor' : 'sigurnost.note.general')}</Body> : null}
      <GlassCard contentStyle={styles.card}>
        <Title>{t('sigurnost.card.title')}</Title>
        <Body tone="mist">{t('sigurnost.card.body')}</Body>
      </GlassCard>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  rows: { padding: 16, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  flex: { flex: 1 },
  card: { padding: 16, gap: 8 },
});
