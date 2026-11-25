import { StyleSheet, View } from 'react-native';
import { Pill } from '@/components';
import { t } from '@/copy/sr';
import type { LevelKey } from '@/theme/tokens';
import type { CellModel } from './model';

const ORDER: LevelKey[] = ['voda', 'ulje', 'riba', 'bezmesa'];

/** Chips for what actually appears in the visible month, so the legend never explains colours that are not there. */
export function Legend({ cells }: { cells: (CellModel | null)[] }) {
  const days = cells.filter((c): c is CellModel => c !== null);
  const levels = ORDER.filter((l) => days.some((c) => c.orb === 'level' && c.level === l));
  const ramadan = days.some((c) => c.orb === 'ramadan');
  const nafila = days.some((c) => c.nafila);
  const slava = days.some((c) => c.slava);
  if (!levels.length && !ramadan && !nafila && !slava) return null;
  return (
    <View style={styles.row} testID="kal-legend">
      {levels.map((l) => (
        <Pill key={l} level={l} />
      ))}
      {ramadan ? <Pill label={t('kal.legend.ramadan')} tone="neutral" /> : null}
      {nafila ? <Pill label={t('kal.legend.nafila')} tone="teal" /> : null}
      {slava ? <Pill label={t('kal.legend.slava')} tone="neutral" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
