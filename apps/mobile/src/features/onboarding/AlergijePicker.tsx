import { ALLERGENS, pl } from '@fastself/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Body, Caption, Chip, GlassCard, SecondaryButton, TextField } from '@/components';
import { t } from '@/copy/sr';
import { useSettings, useUpdateSettings } from '@/hooks';
import {
  addAllergen,
  addAllergyInput,
  allergyCount,
  customChipId,
  removeAllergen,
  removeCustom,
  toggleDiet,
} from './flow';

const DIETS = ['vegetarian', 'vegan', 'halal'] as const;

/** Allergies and diet selection shared by onboarding step 2 and the pushed "alergije" screen. Writes at once. */
export function AlergijePicker() {
  const s = useSettings();
  const update = useUpdateSettings();
  const [text, setText] = useState('');
  const state = { allergies: s.allergies, customAvoid: s.customAvoid };
  const count = allergyCount(state);
  const apply = (next: typeof state) => update({ allergies: next.allergies, customAvoid: next.customAvoid });

  const submit = () => {
    apply(addAllergyInput(state, text));
    setText('');
  };

  return (
    <View style={styles.stack}>
      <GlassCard contentStyle={styles.card}>
        <View style={styles.row}>
          <Caption>{t('alergije.mine')}</Caption>
          <Caption>
            {t('alergije.count', { n: count, word: pl(count, ['namirnica', 'namirnice', 'namirnica']) })}
          </Caption>
        </View>
        {count === 0 ? (
          <Body tone="mist">{t('alergije.empty')}</Body>
        ) : (
          <View style={styles.chips}>
            {s.allergies.map((id) => {
              const name = ALLERGENS.find((a) => a.id === id)?.name ?? id;
              return (
                <Chip
                  key={id}
                  variant="remove"
                  testID={`chip-my-${id}`}
                  label={name}
                  accessibilityLabel={t('alergije.remove.a11y', { name })}
                  onPress={() => apply(removeAllergen(state, id))}
                />
              );
            })}
            {s.customAvoid.map((word) => (
              <Chip
                key={word}
                variant="remove"
                testID={`chip-my-${customChipId(word)}`}
                label={word}
                accessibilityLabel={t('alergije.remove.a11y', { name: word })}
                onPress={() => apply(removeCustom(state, word))}
              />
            ))}
          </View>
        )}
      </GlassCard>

      <View style={styles.inputRow}>
        <View style={styles.flex}>
          <TextField
            testID="input-allergen"
            label={t('alergije.input.label')}
            placeholder={t('alergije.input.placeholder')}
            value={text}
            onChangeText={setText}
            onSubmitEditing={submit}
            returnKeyType="done"
            autoCapitalize="none"
            blurOnSubmit={false}
          />
        </View>
        <SecondaryButton
          testID="btn-add-allergen"
          label={t('alergije.input.add')}
          onPress={submit}
          style={styles.add}
        />
      </View>

      <View style={styles.group}>
        <Caption>{t('alergije.common')}</Caption>
        <View style={styles.chips}>
          {ALLERGENS.filter((a) => !s.allergies.includes(a.id)).map((a) => (
            <Chip
              key={a.id}
              variant="add"
              testID={`chip-add-${a.id}`}
              label={a.name}
              onPress={() => apply(addAllergen(state, a.id))}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <Caption>{t('alergije.diet')}</Caption>
        <View style={styles.chips}>
          {DIETS.map((key) => (
            <Chip
              key={key}
              variant="toggle"
              testID={`chip-diet-${key}`}
              label={t(`alergije.diet.${key}`)}
              selected={s.diets[key]}
              onPress={() => update({ diets: toggleDiet(s.diets, key) })}
            />
          ))}
        </View>
      </View>

      <Caption>{t('alergije.disclaimer')}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 18 },
  card: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  flex: { flex: 1 },
  add: { width: 96, marginBottom: 2 },
  group: { gap: 10 },
});
