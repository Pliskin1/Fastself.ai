import { shoppingList } from '@fastself/core';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Caption, Display, Icon, ScreenScroll, Text, haptics } from '@/components';
import { t } from '@/copy/sr';
import { color, layout, radius } from '@/theme/tokens';
import { capitalFirst, shoppingCount, toPlanDays } from './model';
import { loadChecks, loadMealPlan, setCheck } from './storage';

export function ShoppingSheet() {
  // Read once on mount: the repo is not reactive, and a sheet is a fresh mount every time it opens.
  const [items] = useState(() => {
    const plan = loadMealPlan();
    return plan ? shoppingList(toPlanDays(plan.days)) : [];
  });
  const [checked, setChecked] = useState<readonly string[]>(() => [...loadChecks()]);

  const toggle = (name: string) => {
    haptics.selection();
    const on = !checked.includes(name);
    setCheck(name, on);
    setChecked(on ? [...checked, name] : checked.filter((item) => item !== name));
  };

  return (
    <View style={styles.fill}>
      <ScreenScroll testID="screen-kupovina">
        <Display style={styles.title}>{t('plan.shopping')}</Display>
        <Caption>{t('plan.shopping.caption')}</Caption>
        <View style={styles.list}>
          {items.map((item) => {
            const on = checked.includes(item.name);
            const name = capitalFirst(item.name);
            const count = shoppingCount(item.count);
            return (
              <Pressable
                key={item.name}
                testID={`shop-item-${item.name}`}
                accessibilityRole="checkbox"
                accessibilityLabel={count ? `${name}, ${count}` : name}
                accessibilityState={{ checked: on }}
                onPress={() => toggle(item.name)}
                style={styles.row}
              >
                <View style={[styles.box, on && styles.boxOn]}>
                  {on ? <Icon name="check" size={16} color={color.sunInk} /> : null}
                </View>
                <View style={[styles.text, on && styles.textOn]}>
                  <Text variant="body" style={on ? styles.struck : undefined}>
                    {name}
                  </Text>
                  {count ? (
                    <Text variant="caption" tone="mist" style={on ? styles.struck : undefined}>
                      {count}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same solid-ish sheet background as the report sheet, so Android shows a readable sheet.
  fill: { flex: 1, backgroundColor: 'rgba(11,13,36,0.96)' },
  title: { fontSize: 30, lineHeight: 34 },
  list: { gap: 2 },
  row: { minHeight: layout.minHit, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.chip / 2,
    borderWidth: 1.5,
    borderColor: color.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: color.sun, borderColor: color.sun },
  text: { flex: 1, minWidth: 0, gap: 2 },
  textOn: { opacity: 0.45 },
  struck: { textDecorationLine: 'line-through' },
});
