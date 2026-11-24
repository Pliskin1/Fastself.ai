import { epochFromLocal } from '@fastself/core';
import { useMemo, useState } from 'react';
import Animated from 'react-native-reanimated';
import { Caption, ScreenScroll, useMotion } from '@/components';
import { t } from '@/copy/sr';
import { Actions, Complications, ExceptionCard, Legend, PlateCard, WhyReceipt } from '@/features/danas/DayContent';
import {
  NafilaCard,
  RamadanCard,
  RamadanCountdown,
  SlavaCard,
  VaktijaCard,
  WeekStrip,
} from '@/features/danas/SituationCards';
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
  const [whyOpen, setWhyOpen] = useState(false);
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
      <Animated.View entering={enter(3)} style={{ gap: 18 }}>
        <Legend model={model} />
        <Complications plan={plan} />
        <ExceptionCard plan={plan} settings={settings} />
        <PlateCard plan={plan} settings={settings} />
        <Actions plan={plan} onToggleWhy={() => setWhyOpen((v) => !v)} />
        {whyOpen ? <WhyReceipt plan={plan} /> : null}
        <RamadanCard plan={plan} />
        <VaktijaCard plan={plan} settings={settings} />
        <NafilaCard plan={plan} settings={settings} />
        <RamadanCountdown plan={plan} settings={settings} />
        <SlavaCard today={today} settings={settings} />
        <WeekStrip today={today} />
        <Caption>{t('common.disclaimer')}</Caption>
      </Animated.View>
    </ScreenScroll>
  );
}
