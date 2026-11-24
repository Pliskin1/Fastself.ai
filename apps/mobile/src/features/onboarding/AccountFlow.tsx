import { StyleSheet, View } from 'react-native';
import { Body, Caption, Display, GlassCard, Icon, ScreenScroll, SecondaryButton } from '@/components';
import { t } from '@/copy/sr';
import { color } from '@/theme/tokens';
import { finishOnboarding } from './navigation';

type Props = {
  mode: 'onboarding' | 'push';
  returning?: boolean;
  testID: string;
};

const BULLETS = ['nalog.bullet.1', 'nalog.bullet.2', 'nalog.bullet.3'] as const;

/**
 * Account step. Only the start state exists so far: the copy and "Nastavi bez naloga". Apple sign in and the email
 * code flow arrive with T17 in this same component.
 */
export function AccountFlow({ mode, returning = false, testID }: Props) {
  return (
    <ScreenScroll testID={testID} contentStyle={styles.content}>
      <View style={styles.head}>
        <Display>{t(returning ? 'nalog.title.returning' : 'nalog.title.new')}</Display>
        <Body tone="mist">{t(returning ? 'nalog.sub.returning' : 'nalog.sub.new')}</Body>
      </View>

      {returning ? null : (
        <GlassCard contentStyle={styles.bullets}>
          {BULLETS.map((key) => (
            <View key={key} style={styles.bullet}>
              <Icon name="check" size={16} color={color.teal} />
              <Body style={styles.flex}>{t(key)}</Body>
            </View>
          ))}
        </GlassCard>
      )}

      {mode === 'onboarding' ? (
        <SecondaryButton testID="btn-skip-account" label={t('nalog.skip')} onPress={finishOnboarding} />
      ) : null}
      <Caption style={styles.legal}>{t('nalog.legal')}</Caption>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12 },
  head: { gap: 8 },
  bullets: { padding: 16, gap: 12 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  legal: { textAlign: 'center' },
});
