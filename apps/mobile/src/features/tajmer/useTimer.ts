import { useCallback, useState } from 'react';
import { fastingSessions, type FastDay, type FastingSession } from '@/db/repo';
import { haptics } from '@/components';
import { cancelIfEnd, scheduleIfEnd } from '@/notifications';
import { useSettings } from '@/hooks';
import { resultMessage } from './model';

/**
 * The running fast and the last seven days. The session lives in SQLite, so a force-quit loses nothing: the state
 * is read again on the first render.
 */
export function useTimer() {
  const settings = useSettings();
  const [session, setSession] = useState<FastingSession | null>(() => fastingSessions.current());
  const [week, setWeek] = useState<FastDay[]>(() => fastingSessions.last7());
  const [result, setResult] = useState<string | null>(null);

  const start = useCallback(() => {
    const started = fastingSessions.start(settings.ifPlan);
    setSession(started);
    setWeek(fastingSessions.last7());
    setResult(null);
    haptics.impactLight();
    void scheduleIfEnd(started.startedAt + started.targetHours * 3600e3);
  }, [settings.ifPlan]);

  const stop = useCallback(() => {
    const ended = fastingSessions.stop();
    setSession(null);
    setWeek(fastingSessions.last7());
    if (ended) setResult(resultMessage(ended));
    haptics.success();
    void cancelIfEnd();
  }, []);

  return { session, week, result, start, stop };
}
