import { shoppingList, validateRecipe } from '@fastself/core';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Caption, Display, Icon, ScreenScroll, Text, haptics } from '@/components';
import { t } from '@/copy/sr';
import { useRange, useSettings, useToday } from '@/hooks';
import { color, layout, radius } from '@/theme/tokens';
import { capitalFirst, revalidateStored, shoppingCount, toPlanDays } from './model';
import { loadChecks, loadMealPlan, setCheck } from './storage';

export function ShoppingSheet() {
  const today = useToday();
  const settings = useSettings();
  const { plans } = useRange(today, 7);
  // Read once on mount: the repo is not reactive, and a sheet is a fresh mount every time it opens.
  // The recipes are validated again against today's settings before they make a shopping list (CLAUDE.md rule 4).
  const [items] = useState(() => {
    const plan = loadMealPlan();
    return plan ? shoppingList(toPlanDays(revalidateStored(plan.days, plans, settings, validateRecipe))) : [];
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
  // Opaque on purpose: the route background is transparent, and at 0.96 the screen behind ghosted through on Android.
  fill: { flex: 1, backgroundColor: color.ink },
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
