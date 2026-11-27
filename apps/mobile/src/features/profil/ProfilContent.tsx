import { RULE_PACK_VERSION } from '@fastself/core';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { Body, Caption, GlassCard, LinkButton, SecondaryButton, Title, useToast } from '@/components';
import { t } from '@/copy/sr';
import { useSettings, useUpdateSettings } from '@/hooks';
import { signOut, useSession } from '@/lib/auth';
import { exportData } from '@/lib/export';
import { ensureNotificationPermission } from '@/notifications/permissions';
import { deleteServerCopy } from '@/sync';
import { setConsents } from '@/sync/consents';
import { Group, LinkRow, SwitchRow } from './Rows';
import { allergySummary, practiceSummary } from './model';
import { useConsent } from './useConsent';

const SYNC_KINDS = ['practices', 'allergies', 'history'] as const;

const go = (href: string) => () => router.push(href as Href);

/** Sync is on when any of the three sync consents is on. */
function useSyncConsent(): [boolean, (on: boolean) => void] {
  const [practices, setPractices] = useConsent('practices');
  const [allergies, setAllergies] = useConsent('allergies');
  const [history, setHistory] = useConsent('history');
  const set = (on: boolean) => {
    setPractices(on);
    setAllergies(on);
    setHistory(on);
  };
  return [practices || allergies || history, set];
}

export function AccountCard() {
  const { user } = useSession();
  const toast = useToast();
  const [syncOn] = useSyncConsent();
  const [busy, setBusy] = useState(false);
  if (user) {
    const onSignOut = async () => {
      setBusy(true);
      const result = await signOut();
      setBusy(false);
      toast.show(t(result.ok ? 'nalog.loggedOut' : 'profil.signOut.error'));
    };
    return (
      <GlassCard contentStyle={styles.card} testID="account-card">
        <Title>{t('profil.account.title')}</Title>
        <Body testID="account-email">{t('profil.account.body', { email: user.email ?? '' })}</Body>
        <Body tone="mist">{t(syncOn ? 'profil.account.syncOn' : 'profil.account.syncOff')}</Body>
        <SecondaryButton
          testID="btn-sign-out"
          label={t('profil.signOut')}
          disabled={busy}
          onPress={() => void onSignOut()}
        />
        <LinkButton testID="btn-delete-account" label={t('profil.delete.account')} onPress={go('/(sheets)/brisanje')} />
      </GlassCard>
    );
  }
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
  const toast = useToast();
  const set = (key: keyof typeof reminders) => async (value: boolean) => {
    if (value && !(await ensureNotificationPermission())) {
      toast.show(t('profil.rem.denied'));
      return;
    }
    update({ reminders: { ...reminders, [key]: value } });
  };
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

export function PrivacyGroup() {
  const toast = useToast();
  const { user } = useSession();
  const [syncOn, setSyncLocal] = useSyncConsent();

  const onSync = async (value: boolean) => {
    if (!user) {
      router.push('/nalog' as Href);
      return;
    }
    const changes = Object.fromEntries(SYNC_KINDS.map((kind) => [kind, value]));
    setSyncLocal(value);
    const result = await setConsents(changes);
    if (!result.ok) toast.show(t('profil.sync.error'));
    else toast.show(t(value ? 'profil.sync.toastOn' : 'profil.sync.toastOff'));
    if (value) return;
    Alert.alert(t('profil.sync.askTitle'), t('profil.sync.askBody'), [
      { text: t('profil.sync.askKeep'), style: 'cancel' },
      {
        text: t('profil.sync.askDelete'),
        style: 'destructive',
        onPress: () => {
          void deleteServerCopy(SYNC_KINDS).then((deleted) =>
            toast.show(t(deleted.ok ? 'profil.sync.deleted' : 'profil.sync.error')),
          );
        },
      },
    ]);
  };

  const onExport = async () => {
    const result = await exportData();
    toast.show(t(result.ok ? 'profil.export.done' : 'profil.export.error'));
  };

  return (
    <Group title={t('profil.group.privacy')}>
      <SwitchRow
        testID="sw-sync"
        title={t('profil.sync')}
        sub={t('profil.sync.sub')}
        value={Boolean(user) && syncOn}
        onValueChange={(value) => void onSync(value)}
      />
      <LinkRow testID="row-privacy" title={t('profil.policy')} onPress={go('/privatnost')} />
      <LinkRow testID="row-terms" title={t('profil.terms')} onPress={go('/uslovi')} />
      <LinkRow testID="row-export" title={t('profil.export')} onPress={() => void onExport()} />
      <LinkRow
        testID="row-delete"
        title={t(user ? 'profil.delete.account' : 'profil.delete.local')}
        onPress={go('/(sheets)/brisanje')}
        last
      />
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
