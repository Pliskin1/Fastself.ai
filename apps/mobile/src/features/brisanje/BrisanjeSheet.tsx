import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Body, Caption, Display, ScreenScroll, SecondaryButton, useToast } from '@/components';
import { t } from '@/copy/sr';
import { deleteAccountAndSignOut, wipeDevice } from '@/lib/account';
import { hasStoredSession, useSession } from '@/lib/auth';
import { color } from '@/theme/tokens';
import { DangerButton } from './DangerButton';

// "brisanje" (docs/SCREENS.md): delete the account, or wipe this phone. After an account delete the sheet asks
// whether to wipe the phone too; from then on the phase, not the session (now signed out), decides what is shown.

type Phase = 'confirm' | 'alsoLocal';
type Variant = 'account' | 'local' | 'alsoLocal';
type ErrorKey = 'common.error.network' | 'delete.error';

const TITLE: Record<Variant, string> = {
  account: 'delete.title.account',
  local: 'delete.title.local',
  alsoLocal: 'delete.alsoLocal',
};

/**
 * Closes the sheet and every screen under it, then starts again from `/`, which sends a phone that is no longer
 * onboarded to welcome. `dismissAll` pops the root stack to its first screen; `replace` then swaps that one.
 */
function restartFromIndex(): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/' as Href);
}

export function BrisanjeSheet() {
  const toast = useToast();
  const { user, provider } = useSession();
  const [phase, setPhase] = useState<Phase>('confirm');
  // `useSession` is a guest until the session is loaded, and stays one when a stored session could not be refreshed
  // offline. A signed-in user must never get the wipe in place of the account delete, so the sheet also asks
  // whether a session is stored, and confirm waits for that answer.
  const [stored, setStored] = useState<boolean | null>(null);
  // True while the account delete is in flight: its sign-out must not switch the texts to the local ones first.
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  // State updates land a render later; the ref stops a second press that comes before that.
  const busy = useRef(false);
  // The sheet can be swiped away while a call is in flight. Then router.back() would close whatever screen is on top.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    hasStoredSession().then(
      (answer) => {
        if (live) setStored(answer);
      },
      () => {
        if (live) setStored(false);
      },
    );
    return () => {
      live = false;
    };
  }, []);

  const begin = (): boolean => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError(null);
    return true;
  };

  const fail = (key: ErrorKey) => {
    busy.current = false;
    if (!mounted.current) return;
    setPending(false);
    setDeleting(false);
    setError(key);
  };

  const wipe = async () => {
    if (!begin()) return;
    try {
      await wipeDevice();
    } catch {
      fail('delete.error');
      return;
    }
    // Also when the sheet was swiped away meanwhile: every screen still open shows data that no longer exists.
    restartFromIndex();
  };

  const removeAccount = async () => {
    if (!begin()) return;
    setDeleting(true);
    let failure: ErrorKey | null;
    try {
      const result = await deleteAccountAndSignOut();
      failure = result.ok ? null : result.error === 'offline' ? 'common.error.network' : 'delete.error';
    } catch {
      failure = 'delete.error';
    }
    if (failure) {
      fail(failure);
      return;
    }
    busy.current = false;
    toast.show(t('delete.done.account'));
    if (!mounted.current) return;
    setPending(false);
    setDeleting(false);
    setPhase('alsoLocal');
  };

  const variant: Variant =
    phase === 'alsoLocal' ? 'alsoLocal' : user || deleting || stored === true ? 'account' : 'local';

  return (
    <View testID="screen-brisanje" style={styles.fill}>
      <ScreenScroll>
        {variant === 'alsoLocal' ? (
          // The toast sits under the native sheet and may not be seen; the screen reader already heard it.
          <Body testID="delete-done" style={styles.done}>
            {t('delete.done.account')}
          </Body>
        ) : null}
        <Display style={styles.title}>{t(TITLE[variant])}</Display>
        <Body tone="mist">{t(variant === 'account' ? 'delete.body.account' : 'delete.body.local')}</Body>
        {variant === 'account' && provider === 'apple' ? <Caption>{t('delete.apple')}</Caption> : null}
        {error ? (
          <Caption
            testID="delete-error"
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={styles.error}
          >
            {t(error)}
          </Caption>
        ) : null}
        <DangerButton
          testID="btn-confirm-delete"
          label={t(variant === 'account' ? 'delete.confirm.account' : 'delete.confirm.local')}
          disabled={pending || stored === null}
          busy={pending}
          onPress={variant === 'account' ? removeAccount : wipe}
        />
        {variant === 'alsoLocal' ? (
          <SecondaryButton
            testID="btn-keep-local"
            label={t('delete.keepLocal')}
            disabled={pending}
            onPress={() => router.back()}
          />
        ) : (
          <SecondaryButton
            testID="btn-cancel-delete"
            label={t('common.cancel')}
            disabled={pending}
            onPress={() => router.back()}
          />
        )}
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.ink },
  title: { fontSize: 28, lineHeight: 32 },
  done: { color: color.tealInk },
  error: { color: color.emberInk },
});
