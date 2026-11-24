import type { ExceptionReason } from '@fastself/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Body, Caption, Chip, Display, PrimaryButton, ScreenScroll, useToast } from '@/components';
import { t } from '@/copy/sr';
import { useDayPlan, useSettings, useToday, useUpdateSettings } from '@/hooks';

const REASONS: ExceptionReason[] = ['zdravlje', 'putovanje', 'drugo'];

export default function IzuzetakSheet() {
  const today = useToday();
  const plan = useDayPlan();
  const settings = useSettings();
  const update = useUpdateSettings();
  const toast = useToast();
  const [reason, setReason] = useState<ExceptionReason | null>(null);

  const confirm = () => {
    if (!reason) return;
    update({ exceptions: { ...settings.exceptions, [today]: reason } });
    toast.show(t(plan.ramadanDay > 0 ? 'exception.done.kaza' : 'exception.done'));
    router.back();
  };

  return (
    <View style={styles.fill}>
      <ScreenScroll testID="screen-izuzetak" contentStyle={styles.content}>
        <Display style={styles.title}>{t('exception.title')}</Display>
        <Body tone="mist">{t('exception.body')}</Body>
        <View style={styles.chips}>
          {REASONS.map((r) => (
            <Chip
              key={r}
              variant="toggle"
              testID={`chip-reason-${r}`}
              label={t(`exception.reason.${r}`)}
              selected={reason === r}
              onPress={() => setReason(r)}
            />
          ))}
        </View>
        {plan.ramadanDay > 0 ? <Caption>{t('exception.kaza')}</Caption> : null}
        <PrimaryButton
          testID="btn-confirm-exception"
          label={t('exception.confirm')}
          disabled={!reason}
          onPress={confirm}
        />
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'rgba(11,13,36,0.96)' },
  content: { paddingTop: 24 },
  title: { fontSize: 30, lineHeight: 34 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
