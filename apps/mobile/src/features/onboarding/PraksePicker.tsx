import { SLAVE, type SlavaId } from '@fastself/core';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Body, Caption, Choice, Chip, GlassCard, Icon, Segmented, Text, useMotion } from '@/components';
import { t } from '@/copy/sr';
import { useSettings, useUpdateSettings } from '@/hooks';
import { color } from '@/theme/tokens';
import { togglePractice } from './flow';

const STRICTNESS = ['voda', 'ulje', 'riba'] as const;
const IF_PLANS = ['12', '14', '16'] as const;
const NO_SLAVA = 'none';

/** Practice selection shared by onboarding step 1 and the pushed "prakse" screen. Writes to the settings store at once. */
export function PraksePicker() {
  const s = useSettings();
  const update = useUpdateSettings();
  const { enter } = useMotion();
  const [slavaOpen, setSlavaOpen] = useState(false);
  const { orthodox, ramadan, nafila, ifOn } = s.practices;
  const toggle = (key: 'orthodox' | 'ramadan' | 'nafila' | 'ifOn') =>
    update({ practices: togglePractice(s.practices, key, s.minor) });
  const slavaName = SLAVE.find((x) => x.id === s.slavaId)?.name ?? t('prakse.slava.none');

  return (
    <View style={styles.stack}>
      <Group title={t('prakse.group.orthodox')}>
        <Choice
          role="checkbox"
          testID="choice-orthodox"
          title={t('prakse.orthodox.title')}
          description={t('prakse.orthodox.desc')}
          checked={orthodox}
          onPress={() => toggle('orthodox')}
        />
        {orthodox ? (
          <Animated.View entering={enter(0)}>
            <GlassCard contentStyle={styles.panel}>
              <Caption>{t('prakse.strog.label')}</Caption>
              <Segmented
                testID="seg-strog"
                items={STRICTNESS.map((key) => ({ key, label: t(`prakse.strog.${key}`) }))}
                value={s.strictness}
                onChange={(strictness) => update({ strictness })}
              />
              <Body tone="mist">{t(`prakse.strog.note.${s.strictness}`)}</Body>
              <Pressable
                testID="btn-slava"
                accessibilityRole="button"
                accessibilityState={{ expanded: slavaOpen }}
                accessibilityLabel={`${t('prakse.slava.label')}: ${slavaName}`}
                onPress={() => setSlavaOpen((v) => !v)}
                style={styles.slavaRow}
              >
                <View style={styles.flex}>
                  <Caption>{t('prakse.slava.label')}</Caption>
                  <Text variant="bodyStrong">{slavaName}</Text>
                </View>
                <Icon name="expand" size={20} color={color.mist} />
              </Pressable>
              {slavaOpen ? (
                <View style={styles.chips}>
                  {SLAVE.map((x) => (
                    <Chip
                      key={x.id}
                      variant="toggle"
                      testID={`chip-slava-${x.id}`}
                      label={x.name}
                      selected={s.slavaId === x.id}
                      onPress={() => update({ slavaId: x.id as SlavaId })}
                    />
                  ))}
                  <Chip
                    variant="toggle"
                    testID={`chip-slava-${NO_SLAVA}`}
                    label={t('prakse.slava.none')}
                    selected={s.slavaId === null}
                    onPress={() => update({ slavaId: null })}
                  />
                </View>
              ) : null}
            </GlassCard>
          </Animated.View>
        ) : null}
      </Group>

      <Group title={t('prakse.group.islam')}>
        <Choice
          role="checkbox"
          testID="choice-ramadan"
          title={t('prakse.ramadan.title')}
          description={t('prakse.ramadan.desc')}
          checked={ramadan}
          onPress={() => toggle('ramadan')}
        />
        <Choice
          role="checkbox"
          testID="choice-nafila"
          title={t('prakse.nafila.title')}
          description={t('prakse.nafila.desc')}
          checked={nafila}
          onPress={() => toggle('nafila')}
        />
      </Group>

      <Group title={t('prakse.group.habit')}>
        <Choice
          role="checkbox"
          testID="choice-if"
          title={t('prakse.if.title')}
          description={s.minor ? t('prakse.if.minor') : t('prakse.if.desc')}
          checked={ifOn}
          disabled={s.minor}
          onPress={() => toggle('ifOn')}
        />
        {ifOn ? (
          <Animated.View entering={enter(0)}>
            <Segmented
              testID="seg-if"
              items={IF_PLANS.map((key) => ({ key, label: t(`prakse.if.${key}`) }))}
              value={String(s.ifPlan) as (typeof IF_PLANS)[number]}
              onChange={(key) => update({ ifPlan: Number(key) as 12 | 14 | 16 })}
            />
          </Animated.View>
        ) : null}
      </Group>

      {orthodox && ifOn ? <Caption>{t('prakse.combo.orthodoxIf')}</Caption> : null}
      {ramadan && ifOn ? <Caption>{t('prakse.combo.ramadanIf')}</Caption> : null}
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Caption>{title}</Caption>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 18 },
  group: { gap: 10 },
  panel: { padding: 16, gap: 12 },
  slavaRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 8 },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
