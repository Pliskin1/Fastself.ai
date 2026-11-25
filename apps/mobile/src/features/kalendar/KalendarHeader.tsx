import { MONTHS } from '@fastself/core';
import { StyleSheet, View } from 'react-native';
import { Display, IconButton, LinkButton, Text } from '@/components';
import { t } from '@/copy/sr';
import { font } from '@/theme/fonts';
import type { MonthRef } from './model';

type Props = { month: MonthRef; showToday: boolean; onPrev: () => void; onNext: () => void; onToday: () => void };

export function KalendarHeader({ month, showToday, onPrev, onNext, onToday }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Display>{MONTHS[month.m - 1]}</Display>
        <Text style={styles.year} tone="mist">
          {month.y}
        </Text>
      </View>
      <View style={styles.controls}>
        {showToday ? <LinkButton testID="btn-cal-today" label={t('kal.today')} onPress={onToday} /> : null}
        <View style={styles.spacer} />
        <IconButton testID="btn-cal-prev" icon="back" accessibilityLabel={t('kal.prev.a11y')} onPress={onPrev} />
        <IconButton testID="btn-cal-next" icon="next" accessibilityLabel={t('kal.next.a11y')} onPress={onNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  year: { fontFamily: font.serifItalic, fontSize: 20, lineHeight: 26 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spacer: { flex: 1 },
});
