import { longDate, parseIsoDate } from '@fastself/core';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Body,
  Caption,
  Display,
  KeyboardScreen,
  PrimaryButton,
  TextField,
  Text,
  haptics,
  useToast,
} from '@/components';
import { t } from '@/copy/sr';
import { sendReport, type ReportType } from '@/lib/api';
import { color, layout, radius } from '@/theme/tokens';
import { buildReport, canSend, MAX_LENGTH, REPORT_TYPES, validDay } from './model';

// The entry point contract (docs/team/ANDREJ.md): context is one of these, and 'recipe' may come with a recipeId.
type Props = { date?: string; context?: string; recipeId?: string };

const KNOWN_CONTEXTS = ['danas', 'kalendar', 'profil', 'recipe'];

function contextLine(date?: string, context?: string): string {
  const parts: string[] = [];
  const day = validDay(date);
  const n = day ? parseIsoDate(day) : null;
  if (n !== null) parts.push(longDate(n));
  const ctx = context?.trim();
  // An unknown context is still sent, but a raw slug is never shown.
  if (ctx && KNOWN_CONTEXTS.includes(ctx)) parts.push(t(`report.context.${ctx}`));
  return t('report.context', { value: parts.length > 0 ? parts.join(', ') : t('report.context.general') });
}

export function ReportForm({ date, context, recipeId }: Props) {
  const toast = useToast();
  // Coming from a recipe, the recipe type is already chosen; the user can still change it.
  const [type, setType] = useState<ReportType | null>(context === 'recipe' ? 'recept' : null);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  // The sheet can be swiped away while a send is in flight. Then router.back() would close whatever screen is on top.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const send = async () => {
    if (pending || !type || !canSend(type, text)) return;
    setPending(true);
    setFailed(false);
    const result = await sendReport(
      buildReport({ type, text, date, context, recipeId, appVersion: Constants.expoConfig?.version ?? '' }),
    );
    if (!mounted.current) {
      if (result.ok) toast.show(t('report.sent'));
      return;
    }
    setPending(false);
    if (result.ok) {
      toast.show(t('report.sent'));
      router.back();
    } else {
      setFailed(true);
    }
  };

  return (
    <View style={styles.fill}>
      <KeyboardScreen testID="screen-prijava-greske" sheet>
        <Display style={styles.title}>{t('report.title')}</Display>
        <Body tone="mist">{contextLine(date, context)}</Body>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('report.type.group')} style={styles.chips}>
          {REPORT_TYPES.map((item) => {
            const selected = type === item.type;
            return (
              <Pressable
                key={item.type}
                testID={item.testID}
                accessibilityRole="radio"
                accessibilityLabel={t(item.key)}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => {
                  haptics.selection();
                  setType(item.type);
                }}
                style={[styles.chip, selected && styles.chipOn]}
              >
                <Text variant="small" style={{ color: selected ? color.sunInk : color.paper }}>
                  {t(item.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextField
          testID="input-report"
          label={t('report.input.label')}
          placeholder={t('report.input.placeholder')}
          value={text}
          onChangeText={setText}
          maxLength={MAX_LENGTH}
          multiline
          textAlignVertical="top"
          style={styles.input}
        />
        <Caption>{t('report.note')}</Caption>
        {failed ? (
          <Caption
            testID="report-error"
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={styles.error}
          >
            {t('common.error.network')}
          </Caption>
        ) : null}
        <PrimaryButton
          testID="btn-send-report"
          label={t('report.send')}
          disabled={pending || !canSend(type, text)}
          onPress={send}
        />
      </KeyboardScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'rgba(11,13,36,0.96)' },
  title: { fontSize: 30, lineHeight: 34 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: layout.minHit,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: color.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipOn: { backgroundColor: color.sun, borderColor: color.sun },
  input: { minHeight: 110, paddingTop: 12, paddingBottom: 12, lineHeight: 22 },
  error: { color: color.emberInk },
});
