import { router, type Href } from 'expo-router';
import { Linking, StyleSheet } from 'react-native';
import { Body, GlassCard, LinkButton, SecondaryButton, Title } from '@/components';
import { POLICY_URL, SUPPORT_EMAIL, SUPPORT_URL } from '@/config';
import { t } from '@/copy/sr';

const SECTIONS = [
  { id: 'phone', params: {} },
  { id: 'server', params: {} },
  { id: 'rights', params: { email: SUPPORT_EMAIL } },
] as const;

const open = (url: string) => () => {
  Linking.openURL(url).catch(() => undefined);
};

export function PrivacySections() {
  return (
    <>
      {SECTIONS.map(({ id, params }) => (
        <GlassCard key={id} contentStyle={styles.card} testID={`privacy-${id}`}>
          <Title>{t(`privatnost.${id}.title`)}</Title>
          <Body tone="mist">{t(`privatnost.${id}.body`, params)}</Body>
        </GlassCard>
      ))}
      <SecondaryButton testID="btn-open-policy" label={t('privatnost.policy')} onPress={open(POLICY_URL)} />
      <LinkButton
        testID="btn-open-terms"
        label={t('privatnost.terms')}
        onPress={() => router.push('/uslovi' as Href)}
      />
      <LinkButton testID="btn-open-support" label={t('privatnost.support')} onPress={open(SUPPORT_URL)} />
    </>
  );
}

const styles = StyleSheet.create({ card: { padding: 16, gap: 8 } });
