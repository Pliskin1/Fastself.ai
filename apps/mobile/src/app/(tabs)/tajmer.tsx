import type { IfPlan } from '@fastself/core';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Caption, Display, PrimaryButton, ScreenScroll, Segmented, SecondaryButton, useMotion } from '@/components';
import { t } from '@/copy/sr';
import { ComboNote, MinorCard, OffCard, ResultNote, Stats, WeekChart } from '@/features/tajmer/TajmerContent';
import { TimerRing } from '@/features/tajmer/TimerRing';
import { timerModel } from '@/features/tajmer/model';
import { useTimer } from '@/features/tajmer/useTimer';
import { nowMs } from '@/lib/clock';
import { useDayPlan, useNow, useSettings, useToday, useUpdateSettings } from '@/hooks';

const PLANS = [12, 14, 16] as const;

export default function TajmerScreen() {
  const { enter } = useMotion();
  const settings = useSettings();
  const update = useUpdateSettings();
  const today = useToday();
  const plan = useDayPlan();
  const { now } = useNow();
  const { session, week, result, start, stop } = useTimer();
  // useNow re-renders this screen once a minute, which refreshes the state (fasting to window) and the clock times.
  const model = timerModel(session, settings.ifPlan, nowMs());

  const header = (
    <Animated.View entering={enter(0)}>
      <Display>{t('tajmer.title')}</Display>
    </Animated.View>
  );

  if (settings.minor || !settings.practices.ifOn) {
    return (
      <ScreenScroll testID="screen-tajmer" bottomInset={80} sky>
        {header}
        <Animated.View entering={enter(1)}>{settings.minor ? <MinorCard /> : <OffCard />}</Animated.View>
      </ScreenScroll>
    );
  }

  const running = session !== null;
  return (
    <ScreenScroll testID="screen-tajmer" bottomInset={80} sky>
      {header}
      <Animated.View entering={enter(1)} style={{ gap: 18 }}>
        <View pointerEvents={running ? 'none' : 'auto'} style={{ opacity: running ? 0.5 : 1 }}>
          <Segmented
            testID="seg-plan"
            items={PLANS.map((p) => ({ key: String(p), label: t(`prakse.if.${p}`) }))}
            value={String(model.goalHours)}
            onChange={(key) => update({ ifPlan: Number(key) as IfPlan })}
          />
        </View>
        <TimerRing model={model} now={now} reminderOn={settings.reminders.ifEnd} />
        <Stats model={model} settings={settings} />
        {running ? (
          <SecondaryButton testID="timer-toggle" label={t('tajmer.stop')} onPress={stop} />
        ) : (
          <PrimaryButton testID="timer-toggle" label={t('tajmer.start')} onPress={start} />
        )}
        {result ? <ResultNote text={result} /> : null}
        <ComboNote plan={plan} />
        <WeekChart days={week} goalHours={model.goalHours} today={today} />
        <Caption>{t('tajmer.safety')}</Caption>
      </Animated.View>
    </ScreenScroll>
  );
}
