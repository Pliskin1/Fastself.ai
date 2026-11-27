import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import {
  Body,
  Caption,
  Chip,
  Display,
  PrimaryButton,
  SecondaryButton,
  Text,
  TextField,
  Title,
  haptics,
  useMotion,
} from '@/components';
import { t } from '@/copy/sr';
import { sendReport } from '@/lib/api';
import { spring } from '@/theme/motion';
import { color, layout } from '@/theme/tokens';
import { buildRating, chipsFor, isHigh, MAX_COMMENT, type ChipId, type Score } from './rating';
import { askStoreReview } from './storeReview';

const STAR_PATH = 'M12 2.6l2.8 5.8 6.3.9-4.6 4.5 1.1 6.3L12 17.1l-5.6 3 1.1-6.3L2.9 9.3l6.3-.9L12 2.6z';
const SCORES: Score[] = [1, 2, 3, 4, 5];

function Star({ n, on, onPress, delay }: { n: Score; on: boolean; onPress: () => void; delay: number }) {
  const { reduced } = useMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!on || reduced) {
      scale.value = 1;
      return;
    }
    scale.value = withSequence(
      withTiming(1, { duration: delay }),
      withSpring(1.22, spring.pop),
      withSpring(1, spring.pop),
    );
  }, [on, reduced, delay, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      testID={`star-${n}`}
      accessibilityRole="radio"
      accessibilityLabel={t('ocjena.star.a11y', { n })}
      accessibilityState={{ checked: on, selected: on }}
      onPress={onPress}
      hitSlop={4}
      style={styles.starHit}
    >
      <Animated.View style={style}>
        <Svg width={40} height={40} viewBox="0 0 24 24">
          <Path
            d={STAR_PATH}
            fill={on ? color.sun : 'rgba(255,255,255,0.06)'}
            stroke={on ? color.sun : 'rgba(255,255,255,0.35)'}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

/** "Ocijeni aplikaciju": 1–5 stars, a follow-up that fits the score, an optional comment, then a thank-you. */
export function RatingForm() {
  const { enter } = useMotion();
  const [score, setScore] = useState<Score | null>(null);
  const [chips, setChips] = useState<ChipId[]>([]);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState<Score | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const pick = (n: Score) => {
    haptics.selection();
    if (score !== null && isHigh(score) !== isHigh(n)) setChips([]);
    setScore(n);
  };

  const toggle = (id: ChipId) => {
    haptics.selection();
    setChips((list) => (list.includes(id) ? list.filter((c) => c !== id) : [...list, id]));
  };

  const send = async () => {
    if (pending || score === null) return;
    setPending(true);
    setFailed(false);
    const result = await sendReport(
      buildRating({
        score,
        chipLabels: chips.map((id) => t(`ocjena.chip.${id}`)),
        comment,
        appVersion: Constants.expoConfig?.version ?? '',
      }),
    );
    if (!mounted.current) return;
    setPending(false);
    if (result.ok) {
      haptics.success();
      setSent(score);
    } else {
      haptics.warning();
      setFailed(true);
    }
  };

  if (sent !== null) {
    const high = isHigh(sent);
    return (
      <Animated.View entering={FadeIn.duration(260)} style={styles.thanks} testID="rating-thanks">
        <Svg width={64} height={64} viewBox="0 0 24 24">
          <Path d={STAR_PATH} fill={color.sun} />
        </Svg>
        <Display style={styles.center}>{t('ocjena.thanks.title')}</Display>
        <Body tone="mist" style={styles.center}>
          {t(high ? 'ocjena.thanks.high' : 'ocjena.thanks.low')}
        </Body>
        {high ? (
          <PrimaryButton
            testID="btn-store-review"
            label={t('ocjena.store')}
            onPress={() => {
              void askStoreReview().finally(() => router.back());
            }}
          />
        ) : null}
        <SecondaryButton testID="btn-rating-done" label={t('ocjena.done')} onPress={() => router.back()} />
      </Animated.View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Display style={styles.title}>{t('ocjena.title')}</Display>
        <Body tone="mist">{t('ocjena.sub')}</Body>
      </View>

      <View accessibilityRole="radiogroup" style={styles.stars}>
        {SCORES.map((n) => (
          <Star key={n} n={n} on={score !== null && n <= score} onPress={() => pick(n)} delay={(n - 1) * 40} />
        ))}
      </View>
      <Text variant="bodyStrong" style={[styles.center, styles.scoreLabel]} testID="rating-label">
        {score === null ? null : t(`ocjena.score.${score}`)}
      </Text>

      {score === null ? null : (
        <Animated.View entering={enter(0)} style={styles.follow} key={isHigh(score) ? 'high' : 'low'}>
          <Title>{t(isHigh(score) ? 'ocjena.ask.high' : 'ocjena.ask.low')}</Title>
          <View style={styles.chips}>
            {chipsFor(score).map((id) => (
              <Chip
                key={id}
                testID={`chip-feedback-${id}`}
                variant="toggle"
                selected={chips.includes(id)}
                label={t(`ocjena.chip.${id}`)}
                onPress={() => toggle(id)}
              />
            ))}
          </View>
          <TextField
            testID="input-feedback"
            label={t('ocjena.input.label')}
            placeholder={t(isHigh(score) ? 'ocjena.input.placeholder.high' : 'ocjena.input.placeholder.low')}
            value={comment}
            onChangeText={setComment}
            maxLength={MAX_COMMENT}
            multiline
            textAlignVertical="top"
            style={styles.input}
          />
          <Caption>{t('ocjena.note')}</Caption>
          {failed ? (
            <Caption testID="rating-error" accessibilityRole="alert" style={styles.error}>
              {t('ocjena.error')}
            </Caption>
          ) : null}
          <PrimaryButton
            testID="btn-send-feedback"
            label={t('ocjena.send')}
            disabled={pending}
            onPress={() => void send()}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: layout.sectionGap },
  head: { gap: 8 },
  title: { fontSize: 30, lineHeight: 34 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  starHit: {
    minWidth: layout.minHit + 4,
    minHeight: layout.minHit + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreLabel: { color: color.sun, minHeight: 22 },
  center: { textAlign: 'center' },
  follow: { gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 96, paddingTop: 12, paddingBottom: 12, lineHeight: 22 },
  error: { color: color.emberInk },
  thanks: { gap: 16, alignItems: 'stretch', paddingTop: 12 },
});
