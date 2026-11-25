import { Linking, StyleSheet } from 'react-native';
import { Body, GlassCard, SecondaryButton, Title } from '@/components';
import { t } from '@/copy/sr';
import { AI_PROVIDER_NAME, POLICY_URL, SUPPORT_EMAIL } from './constants';

const SECTIONS = [
  { id: 'phone', params: {} },
  { id: 'server', params: {} },
  { id: 'ai', params: { provider: AI_PROVIDER_NAME } },
  { id: 'rights', params: { email: SUPPORT_EMAIL } },
] as const;

export function PrivacySections() {
  return (
    <>
      {SECTIONS.map(({ id, params }) => (
        <GlassCard key={id} contentStyle={styles.card} testID={`privacy-${id}`}>
          <Title>{t(`privatnost.${id}.title`)}</Title>
          <Body tone="mist">{t(`privatnost.${id}.body`, params)}</Body>
        </GlassCard>
      ))}
      <SecondaryButton
        testID="btn-open-policy"
        label={t('privatnost.policy')}
        onPress={() => {
          Linking.openURL(POLICY_URL).catch(() => undefined);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({ card: { padding: 16, gap: 8 } });
