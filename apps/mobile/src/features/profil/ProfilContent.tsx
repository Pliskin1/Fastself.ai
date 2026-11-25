import { RULE_PACK_VERSION } from '@fastself/core';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Body, Caption, GlassCard, SecondaryButton, Title, useToast } from '@/components';
import { t } from '@/copy/sr';
import { useSettings, useUpdateSettings } from '@/hooks';
import { Group, LinkRow, SwitchRow } from './Rows';
import { allergySummary, practiceSummary } from './model';
import { useConsent } from './useConsent';

const go = (href: string) => () => router.push(href as Href);

export function AccountCard() {
  return (
    <GlassCard contentStyle={styles.card} testID="account-card">
      <Title>{t('profil.local.title')}</Title>
      <Body tone="mist">{t('profil.local.body')}</Body>
      <SecondaryButton testID="btn-open-account" label={t('profil.local.cta')} onPress={go('/nalog')} />
    </GlassCard>
  );
}

export function FastGroup() {
  const settings = useSettings();
  return (
    <Group title={t('profil.group.fast')}>
      <LinkRow
        testID="row-practices"
        title={t('profil.practices')}
        sub={practiceSummary(settings)}
        onPress={go('/prakse')}
      />
      <LinkRow
        testID="row-allergies"
        title={t('profil.allergies')}
        sub={allergySummary(settings)}
        onPress={go('/alergije')}
      />
      <LinkRow testID="row-vaktija" title={t('profil.vaktija')} onPress={go('/vaktija')} last />
    </Group>
  );
}

export function RemindersGroup() {
  const { reminders } = useSettings();
  const update = useUpdateSettings();
  const set = (key: keyof typeof reminders) => (value: boolean) =>
    update({ reminders: { ...reminders, [key]: value } });
  return (
    <Group title={t('profil.group.reminders')}>
      <SwitchRow
        testID="sw-rem-evening"
        title={t('profil.rem.evening')}
        sub={t('profil.rem.evening.sub')}
        value={reminders.evening}
        onValueChange={set('evening')}
      />
      <SwitchRow
        testID="sw-rem-window"
        title={t('profil.rem.window')}
        value={reminders.window}
        onValueChange={set('window')}
      />
      <SwitchRow testID="sw-rem-if" title={t('profil.rem.if')} value={reminders.ifEnd} onValueChange={set('ifEnd')} />
      <SwitchRow
        testID="sw-rem-ramadan"
        title={t('profil.rem.ramadan')}
        sub={t('profil.rem.ramadan.sub')}
        value={reminders.ramadan}
        onValueChange={set('ramadan')}
        last
      />
    </Group>
  );
}

type PrivacyProps = {
  /** Undefined until the data export exists: the row is shown disabled. */
  onExport?: () => void;
};

export function PrivacyGroup({ onExport }: PrivacyProps) {
  const toast = useToast();
  const [ai, setAi] = useConsent('ai');
  const onAi = (value: boolean) => {
    if (value) {
      router.push('/(sheets)/ai-pristanak' as Href);
      return;
    }
    setAi(false);
    toast.show(t('profil.ai.off'));
  };
  return (
    <Group title={t('profil.group.privacy')}>
      <SwitchRow testID="sw-ai" title={t('profil.ai')} sub={t('profil.ai.sub')} value={ai} onValueChange={onAi} />
      <SwitchRow
        testID="sw-sync"
        title={t('profil.sync')}
        sub={t('profil.sync.sub')}
        value={false}
        onValueChange={() => router.push('/nalog' as Href)}
      />
      <LinkRow testID="row-privacy" title={t('profil.policy')} onPress={go('/privatnost')} />
      <LinkRow testID="row-export" title={t('profil.export')} onPress={onExport} disabled={!onExport} />
      <LinkRow testID="row-delete" title={t('profil.delete.local')} onPress={go('/(sheets)/brisanje')} last />
    </Group>
  );
}

export function HelpGroup() {
  return (
    <Group title={t('profil.group.help')}>
      <LinkRow
        testID="row-report"
        title={t('profil.report')}
        sub={t('profil.report.sub')}
        last
        onPress={() => router.push({ pathname: '/(sheets)/prijava-greske', params: { context: 'profil' } } as Href)}
      />
    </Group>
  );
}

export function Footer() {
  return (
    <Caption style={styles.footer}>
      {t('profil.footer', { version: Constants.expoConfig?.version ?? '0.0.0', pack: RULE_PACK_VERSION })}
    </Caption>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12 },
  footer: { textAlign: 'center' },
});
