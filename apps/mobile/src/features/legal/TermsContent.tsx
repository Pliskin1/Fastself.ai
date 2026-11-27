import { router, type Href } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { Body, Caption, GlassCard, LinkButton, SecondaryButton, Text, Title } from '@/components';
import { LEGAL_ENTITY, SUPPORT_EMAIL, TERMS_EFFECTIVE, TERMS_URL } from '@/config';
import { t } from '@/copy/sr';
import { font } from '@/theme/fonts';
import { color } from '@/theme/tokens';

export const TERMS_SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const open = (url: string) => () => {
  Linking.openURL(url).catch(() => undefined);
};

/** The terms of use, readable in the app (docs/legal/terms.md, Montenegrin part). */
export function TermsContent() {
  return (
    <>
      <Caption testID="terms-meta">
        {t('uslovi.meta', { date: TERMS_EFFECTIVE, entity: LEGAL_ENTITY, email: SUPPORT_EMAIL })}
      </Caption>
      <GlassCard contentStyle={styles.card} testID="terms-card">
        {TERMS_SECTIONS.map((n, i) => (
          <View key={n} style={[styles.section, i > 0 ? styles.divider : null]} testID={`terms-${n}`}>
            <View style={styles.row}>
              <Text style={styles.num} accessibilityElementsHidden importantForAccessibility="no">
                {n}
              </Text>
              <Title style={styles.flex}>{t(`uslovi.${n}.title`)}</Title>
            </View>
            <Body tone="mist">{t(`uslovi.${n}.body`)}</Body>
          </View>
        ))}
      </GlassCard>
      <SecondaryButton testID="btn-terms-web" label={t('uslovi.web')} onPress={open(TERMS_URL)} />
      <LinkButton
        testID="btn-terms-privacy"
        label={t('uslovi.privacy')}
        onPress={() => router.push('/privatnost' as Href)}
      />
      <LinkButton testID="btn-terms-contact" label={t('uslovi.contact')} onPress={open(`mailto:${SUPPORT_EMAIL}`)} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 16, paddingVertical: 4 },
  section: { gap: 6, paddingVertical: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.glassBorder },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  num: { fontFamily: font.serif, fontSize: 22, lineHeight: 32, color: color.sunLink, minWidth: 18 },
  flex: { flex: 1 },
});
