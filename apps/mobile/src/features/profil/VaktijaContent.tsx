import { CITIES, type CityId, type PrayerMethod } from '@fastself/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Body, Caption, Chip, Choice, GlassCard, IconButton, SecondaryButton, Text, Title } from '@/components';
import { t } from '@/copy/sr';
import { useSettings, useToday, useUpdateSettings } from '@/hooks';
import { signed, stepOffset, stepShift, zoraAksam, type OffsetKey } from './model';

const METHODS: PrayerMethod[] = ['izcg', 'mwl', 'turkey', 'ummalqura'];

export function CityCard() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const today = useToday();
  const [open, setOpen] = useState(false);
  const { fajr, maghrib } = zoraAksam(today, settings);
  return (
    <GlassCard contentStyle={styles.card} testID="city-card">
      <Title>{CITIES[settings.city].name}</Title>
      <View style={styles.times}>
        <Time label={t('vaktija.fajr')} value={fajr} testID="time-fajr" />
        <Time label={t('vaktija.maghrib')} value={maghrib} testID="time-maghrib" />
      </View>
      <SecondaryButton testID="btn-change-city" label={t('vaktija.changeCity')} onPress={() => setOpen((v) => !v)} />
      {open ? (
        <View style={styles.chips}>
          {(Object.keys(CITIES) as CityId[]).map((id) => (
            <Chip
              key={id}
              variant="toggle"
              testID={`chip-city-${id}`}
              label={CITIES[id].name}
              selected={settings.city === id}
              onPress={() => update({ city: id })}
            />
          ))}
        </View>
      ) : null}
    </GlassCard>
  );
}

function Time({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View style={styles.time}>
      <Caption>{label}</Caption>
      <Text variant="title" testID={testID}>
        {value}
      </Text>
    </View>
  );
}

export function MethodList() {
  const settings = useSettings();
  const update = useUpdateSettings();
  return (
    <View style={styles.methods}>
      <Caption>{t('vaktija.method')}</Caption>
      {METHODS.map((id) => (
        <Choice
          key={id}
          testID={`radio-method-${id}`}
          title={t(`vaktija.method.${id}`)}
          checked={settings.prayerMethod === id}
          onPress={() => update({ prayerMethod: id })}
        />
      ))}
      <Caption>{t('vaktija.method.note')}</Caption>
    </View>
  );
}

function Stepper({
  id,
  label,
  value,
  unit,
  onStep,
}: {
  id: string;
  label: string;
  value: string;
  unit: string;
  onStep: (delta: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text variant="bodyStrong" style={styles.flex}>
        {label}
      </Text>
      <IconButton
        testID={`btn-${id}-minus`}
        icon="minus"
        accessibilityLabel={`${label} −`}
        onPress={() => onStep(-1)}
      />
      <Text variant="bodyStrong" style={styles.value} testID={`val-${id}`}>
        {value} {unit}
      </Text>
      <IconButton testID={`btn-${id}-plus`} icon="plus" accessibilityLabel={`${label} +`} onPress={() => onStep(1)} />
    </View>
  );
}

export function ManualCorrection() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const move = (key: OffsetKey) => (delta: number) => update({ offsets: stepOffset(settings.offsets, key, delta) });
  return (
    <GlassCard contentStyle={styles.card} testID="manual-card">
      <Title>{t('vaktija.manual')}</Title>
      <Stepper
        id="fajr"
        label={t('vaktija.fajr')}
        value={signed(settings.offsets.fajr)}
        unit={t('vaktija.unit.min')}
        onStep={move('fajr')}
      />
      <Stepper
        id="maghrib"
        label={t('vaktija.maghrib')}
        value={signed(settings.offsets.maghrib)}
        unit={t('vaktija.unit.min')}
        onStep={move('maghrib')}
      />
      <Stepper
        id="shift"
        label={t('vaktija.shift')}
        value={signed(settings.ramadanShift)}
        unit={t('vaktija.unit.day')}
        onStep={(delta) => update({ ramadanShift: stepShift(settings.ramadanShift, delta) })}
      />
      <Body tone="mist">{t('vaktija.shift.note')}</Body>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12 },
  times: { flexDirection: 'row', gap: 32 },
  time: { gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methods: { gap: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  value: { minWidth: 76, textAlign: 'center' },
});
