import { useState } from 'react';
import { View } from 'react-native';
import { Body, Caption, GlassCard, SecondaryButton, TextField, useToast } from '@/components';
import { t } from '@/copy/sr';
import { sendEmailCode, signOut, useSession, verifyEmailCode } from '@/lib/auth';
import { useSyncStatus } from '@/sync';
import { setConsents } from '@/sync/consents';

type Outcome = { ok: true } | { ok: false; error: string };

/**
 * Dev screen section: email code sign-in against the project this build points to, so the flow can be checked on a
 * phone before the account screen exists. It shows the provider, the sync status and the raw result of the last call.
 */
export default function AuthSection() {
  const toast = useToast();
  const session = useSession();
  const status = useSyncStatus();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  /** Runs one call and shows "<button label>: ok" or the error code as it came back. */
  const run = async (label: string, call: () => Promise<Outcome>): Promise<boolean> => {
    setBusy(true);
    try {
      const outcome = await call();
      setResult(`${label}: ${outcome.ok ? 'ok' : outcome.error}`);
      return outcome.ok;
    } finally {
      setBusy(false);
    }
  };

  const send = () => run(t('nalog.sendCode'), () => sendEmailCode(email));

  const verify = async () => {
    if (await run(t('nalog.verify'), () => verifyEmailCode(email, code))) setCode('');
  };

  const enableSync = () =>
    run(t('nalog.consent.enable'), () => setConsents({ practices: true, allergies: true, history: true }));

  const logout = async () => {
    if (await run(t('profil.logout'), signOut)) toast.show(t('nalog.loggedOut'));
  };

  return (
    <View style={{ gap: 10 }} testID="dev-auth">
      <Caption>{t('profil.local.cta')}</Caption>
      <GlassCard contentStyle={{ padding: 18, gap: 6 }}>
        <Body testID="dev-auth-session">{[session.provider ?? '-', status].join(' · ')}</Body>
        {session.user?.email ? <Caption testID="dev-auth-email">{session.user.email}</Caption> : null}
        {result ? <Caption testID="dev-auth-result">{result}</Caption> : null}
      </GlassCard>
      {session.user ? (
        <>
          <SecondaryButton
            label={t('nalog.consent.enable')}
            onPress={enableSync}
            disabled={busy}
            testID="dev-auth-consent"
          />
          <SecondaryButton label={t('profil.logout')} onPress={logout} disabled={busy} testID="dev-auth-logout" />
        </>
      ) : (
        <>
          <TextField
            label={t('nalog.email.label')}
            placeholder={t('nalog.email.placeholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            testID="dev-auth-input-email"
          />
          <SecondaryButton label={t('nalog.sendCode')} onPress={send} disabled={busy} testID="dev-auth-send" />
          <TextField
            label={t('nalog.code.a11y')}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
            testID="dev-auth-input-code"
          />
          <SecondaryButton label={t('nalog.verify')} onPress={verify} disabled={busy} testID="dev-auth-verify" />
        </>
      )}
    </View>
  );
}
