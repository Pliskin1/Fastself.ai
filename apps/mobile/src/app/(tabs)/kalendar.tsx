import { isoDate } from '@fastself/core';
import { useRef, useState } from 'react';
import Animated from 'react-native-reanimated';
import { ScreenScroll, haptics, useMotion } from '@/components';
import { DayCard } from '@/features/kalendar/DayCard';
import { KalendarHeader } from '@/features/kalendar/KalendarHeader';
import { Legend } from '@/features/kalendar/Legend';
import { MonthGrid } from '@/features/kalendar/MonthGrid';
import { monthOf, sameMonth, selectionFor, shiftMonth, type MonthRef } from '@/features/kalendar/model';
import { useMonth } from '@/features/kalendar/useMonth';
import { useSettings, useToday } from '@/hooks';

export default function KalendarScreen() {
  const { enter } = useMotion();
  const today = useToday();
  const settings = useSettings();
  const [month, setMonth] = useState<MonthRef>(() => monthOf(today));
  const [selected, setSelected] = useState<number>(today);
  const direction = useRef<-1 | 1>(1);
  const cells = useMonth(month);

  const go = (target: MonthRef, dir: -1 | 1) => {
    direction.current = dir;
    setMonth(target);
    setSelected(selectionFor(target, today));
  };
  const selectedCell = cells.find((c) => c?.n === selected) ?? cells.find((c) => c !== null) ?? null;
  const showToday = !sameMonth(month, monthOf(today)) || selected !== today;

  return (
    <ScreenScroll testID="screen-kalendar" bottomInset={80} sky>
      <Animated.View entering={enter(0)}>
        <KalendarHeader
          month={month}
          showToday={showToday}
          onPrev={() => go(shiftMonth(month, -1), -1)}
          onNext={() => go(shiftMonth(month, 1), 1)}
          onToday={() => {
            direction.current = month.y * 12 + month.m < monthOf(today).y * 12 + monthOf(today).m ? 1 : -1;
            setMonth(monthOf(today));
            setSelected(today);
          }}
        />
      </Animated.View>
      <Animated.View entering={enter(1)}>
        <MonthGrid
          cells={cells}
          monthKey={`${month.y}-${month.m}`}
          direction={direction.current}
          today={today}
          selected={selected}
          isoOf={isoDate}
          onSelect={(n) => {
            haptics.selection();
            setSelected(n);
          }}
        />
      </Animated.View>
      <Animated.View entering={enter(2)} style={{ gap: 18 }}>
        <Legend cells={cells} />
        {selectedCell ? <DayCard cell={selectedCell} settings={settings} /> : null}
      </Animated.View>
    </ScreenScroll>
  );
}
