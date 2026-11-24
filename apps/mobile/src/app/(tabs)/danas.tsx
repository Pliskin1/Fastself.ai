import { epochFromLocal } from '@fastself/core';
import { useMemo } from 'react';
import Animated from 'react-native-reanimated';
import { ScreenScroll, useMotion } from '@/components';
import { DanasHeader } from '@/features/danas/DanasHeader';
import { DayDial } from '@/features/danas/DayDial';
import { dialModel } from '@/features/danas/model';
import { TitleRow } from '@/features/danas/TitleRow';
import { useDayPlan, useNow, useSettings, useToday } from '@/hooks';

export default function DanasScreen() {
  const { enter } = useMotion();
  const today = useToday();
  const plan = useDayPlan();
  const settings = useSettings();
  const { now, minute } = useNow();
  const dayStartMs = useMemo(() => epochFromLocal(today, 0), [today]);
  const model = useMemo(() => dialModel(plan, minute), [plan, minute]);

  return (
    <ScreenScroll testID="screen-danas" bottomInset={80} sky>
      <Animated.View entering={enter(0)}>
        <DanasHeader today={today} />
      </Animated.View>
      <Animated.View entering={enter(1)}>
        <TitleRow plan={plan} settings={settings} />
      </Animated.View>
      <Animated.View entering={enter(2)}>
        <DayDial model={model} dayStartMs={dayStartMs} minute={minute} now={now} />
      </Animated.View>
    </ScreenScroll>
  );
}
