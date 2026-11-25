import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { consents, type ConsentKind } from '@/db/repo/consents';

/** A local consent flag. It is read again whenever the screen gains focus, so a sheet that sets it is reflected. */
export function useConsent(kind: ConsentKind): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => consents.get(kind));
  useFocusEffect(
    useCallback(() => {
      setOn(consents.get(kind));
    }, [kind]),
  );
  const set = useCallback(
    (value: boolean) => {
      consents.set(kind, value);
      setOn(value);
    },
    [kind],
  );
  return [on, set];
}
