import { dayPlan, nextSlava, SLAVE, type DayNum } from '@fastself/core';
import { useMemo } from 'react';
import { useSettings } from '@/hooks';
import { cellModel, firstOfMonth, gridSlots, type CellModel, type MonthRef } from './model';

/** The plan of every day in a month, in Monday-first grid order (null for the blanks). */
export function useMonth({ y, m }: MonthRef): (CellModel | null)[] {
  const settings = useSettings();
  return useMemo(() => {
    const slava = settings.practices.orthodox ? nextSlava(firstOfMonth({ y, m }), settings.slavaId, settings) : null;
    const slavaName = slava ? (SLAVE.find((s) => s.id === slava.id)?.name ?? slava.name) : null;
    return gridSlots({ y, m }).map((n: DayNum | null) =>
      n === null ? null : cellModel(dayPlan(n, settings), slava && slava.n === n ? slavaName : null),
    );
  }, [y, m, settings]);
}
