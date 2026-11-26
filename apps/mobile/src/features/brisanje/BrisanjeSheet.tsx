import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Body, Caption, Display, ScreenScroll, SecondaryButton, useToast } from '@/components';
import { t } from '@/copy/sr';
import { deleteAccountAndSignOut, wipeDevice } from '@/lib/account';
import { useSession } from '@/lib/auth';
import { color } from '@/theme/tokens';
import { DangerButton } from './DangerButton';

// "brisanje" (docs/SCREENS.md): delete the account, or wipe this phone. After an account delete the sheet asks
// whether to wipe the phone too; from then on the phase, not the session (now signed out), decides what is shown.

type Phase = 'confirm' | 'alsoLocal';
type Variant = 'account' | 'local' | 'alsoLocal';

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
  // True while the account delete is in flight: its sign-out must not switch the texts to the local ones first.
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
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

  const begin = (): boolean => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setFailed(false);
    return true;
  };

  const fail = () => {
    busy.current = false;
    if (!mounted.current) return;
    setPending(false);
    setDeleting(false);
    setFailed(true);
  };

  const wipe = async () => {
    if (!begin()) return;
    try {
      await wipeDevice();
    } catch {
      fail();
      return;
    }
    // Also when the sheet was swiped away meanwhile: every screen still open shows data that no longer exists.
    restartFromIndex();
  };

  const removeAccount = async () => {
    if (!begin()) return;
    setDeleting(true);
    let ok = false;
    try {
      ok = (await deleteAccountAndSignOut()).ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      fail();
      return;
    }
    busy.current = false;
    toast.show(t('delete.done.account'));
    if (!mounted.current) return;
    setPending(false);
    setDeleting(false);
    setPhase('alsoLocal');
  };

  const variant: Variant = phase === 'alsoLocal' ? 'alsoLocal' : user || deleting ? 'account' : 'local';

  return (
    <View testID="screen-brisanje" style={styles.fill}>
      <ScreenScroll>
        <Display style={styles.title}>{t(TITLE[variant])}</Display>
        <Body tone="mist">{t(variant === 'account' ? 'delete.body.account' : 'delete.body.local')}</Body>
        {variant === 'account' && provider === 'apple' ? <Caption>{t('delete.apple')}</Caption> : null}
        {failed ? (
          <Caption
            testID="delete-error"
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={styles.error}
          >
            {t('common.error.network')}
          </Caption>
        ) : null}
        <DangerButton
          testID="btn-confirm-delete"
          label={t(variant === 'account' ? 'delete.confirm.account' : 'delete.confirm.local')}
          disabled={pending}
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
  error: { color: color.emberInk },
});
