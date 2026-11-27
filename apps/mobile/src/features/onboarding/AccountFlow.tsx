import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Body,
  Caption,
  Display,
  GlassCard,
  Icon,
  IconButton,
  KeyboardScreen,
  PrimaryButton,
  Segmented,
  SecondaryButton,
  Text,
  TextField,
  haptics,
  useToast,
} from '@/components';
import { t } from '@/copy/sr';
import { MIN_PASSWORD_LENGTH, signInWithPassword, signUpWithPassword, useSession, type AuthError } from '@/lib/auth';
import { setConsents } from '@/sync/consents';
import { color, layout } from '@/theme/tokens';
import { finishOnboarding } from './navigation';

type Props = {
  mode: 'onboarding' | 'push';
  returning?: boolean;
  testID: string;
};

type AuthMode = 'signIn' | 'signUp';

const BULLETS = ['nalog.bullet.1', 'nalog.bullet.2', 'nalog.bullet.3'] as const;

const ERROR_KEY: Partial<Record<AuthError, string>> = {
  invalid_email: 'nalog.err.email',
  invalid_credentials: 'nalog.err.credentials',
  email_taken: 'nalog.err.taken',
  weak_password: 'nalog.err.weak',
  confirm_email: 'nalog.err.confirm',
  offline: 'nalog.err.offline',
  rate_limited: 'nalog.err.rate',
};

export function errorText(error: AuthError): string {
  return t(ERROR_KEY[error] ?? 'nalog.err.server', { n: MIN_PASSWORD_LENGTH });
}

function done(mode: Props['mode']): void {
  if (mode === 'onboarding') finishOnboarding();
  else if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/profil' as Href);
}

/** Account step and the pushed /nalog screen: email + password sign in or sign up, then the sync consent. */
export function AccountFlow({ mode, returning = false, testID }: Props) {
  const toast = useToast();
  const { user } = useSession();
  const [authMode, setAuthMode] = useState<AuthMode>(returning ? 'signIn' : 'signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [askConsent, setAskConsent] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const run = authMode === 'signIn' ? signInWithPassword : signUpWithPassword;
    const result = await run(email, password);
    setBusy(false);
    if (!result.ok) {
      haptics.warning();
      setError(result.error);
      return;
    }
    haptics.success();
    toast.show(t('nalog.signedIn'));
    setPassword('');
    setAskConsent(true);
  };

  const enableSync = async (on: boolean) => {
    if (on) {
      setBusy(true);
      await setConsents({ practices: true, allergies: true, history: true });
      setBusy(false);
    }
    done(mode);
  };

  if (askConsent) {
    return (
      <KeyboardScreen testID={testID} underHeader={mode === 'onboarding'}>
        <View style={styles.head}>
          <Display>{t('nalog.consent.title')}</Display>
          <Body tone="mist">{t('nalog.consent.sub', { email: user?.email ?? email.trim() })}</Body>
        </View>
        <GlassCard contentStyle={styles.bullets}>
          {(['nalog.consent.practices', 'nalog.consent.allergies', 'nalog.consent.history'] as const).map((key) => (
            <View key={key} style={styles.bullet}>
              <Icon name="check" size={16} color={color.teal} />
              <Body style={styles.flex}>{t(key)}</Body>
            </View>
          ))}
          <Caption>{t('nalog.consent.note')}</Caption>
        </GlassCard>
        <PrimaryButton
          testID="btn-enable-sync"
          label={t('nalog.consent.enable')}
          disabled={busy}
          onPress={() => void enableSync(true)}
        />
        <SecondaryButton
          testID="btn-sync-later"
          label={t('nalog.consent.later')}
          onPress={() => void enableSync(false)}
        />
      </KeyboardScreen>
    );
  }

  const errorMessage = error ? errorText(error) : undefined;
  const emailError = error === 'invalid_email' ? errorMessage : undefined;
  const formError = error && error !== 'invalid_email' ? errorMessage : undefined;

  return (
    <KeyboardScreen testID={testID} underHeader={mode === 'onboarding'}>
      {mode === 'push' ? (
        <View style={styles.back}>
          <IconButton testID="btn-back" icon="back" accessibilityLabel={t('common.back')} onPress={() => done(mode)} />
        </View>
      ) : null}

      <View style={styles.head}>
        <Display>{t(returning ? 'nalog.title.returning' : 'nalog.title.new')}</Display>
        <Body tone="mist">{t(returning ? 'nalog.sub.returning' : 'nalog.sub.new')}</Body>
      </View>

      {returning ? null : (
        <GlassCard contentStyle={styles.bullets}>
          {BULLETS.map((key) => (
            <View key={key} style={styles.bullet}>
              <Icon name="check" size={16} color={color.teal} />
              <Body style={styles.flex}>{t(key)}</Body>
            </View>
          ))}
        </GlassCard>
      )}

      <View style={styles.form}>
        <Segmented<AuthMode>
          testID="seg-auth-mode"
          items={[
            { key: 'signUp', label: t('nalog.mode.signUp') },
            { key: 'signIn', label: t('nalog.mode.signIn') },
          ]}
          value={authMode}
          onChange={(next) => {
            setAuthMode(next);
            setError(null);
          }}
        />
        <TextField
          testID="input-email"
          label={t('nalog.email.label')}
          placeholder={t('nalog.email.placeholder')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          error={emailError}
        />
        <View>
          <TextField
            testID="input-password"
            label={t('nalog.password.label')}
            placeholder={t('nalog.password.placeholder', { n: MIN_PASSWORD_LENGTH })}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={authMode === 'signUp' ? 'off' : 'current-password'}
            // 'oneTimeCode' on sign up stops the iOS strong password overlay, which swallowed the typed password.
            textContentType={authMode === 'signUp' ? 'oneTimeCode' : 'password'}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            style={styles.passwordInput}
          />
          <Pressable
            testID="btn-toggle-password"
            accessibilityRole="button"
            accessibilityLabel={t(showPassword ? 'nalog.password.hideA11y' : 'nalog.password.showA11y')}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
            style={styles.toggle}
          >
            <Text variant="caption" style={styles.toggleLabel}>
              {t(showPassword ? 'nalog.password.hide' : 'nalog.password.show')}
            </Text>
          </Pressable>
        </View>
        {formError ? (
          <Caption testID="auth-error" accessibilityLiveRegion="polite" style={styles.error}>
            {formError}
          </Caption>
        ) : null}
        <PrimaryButton
          testID="btn-auth-submit"
          label={t(authMode === 'signIn' ? 'nalog.submit.signIn' : 'nalog.submit.signUp')}
          disabled={busy}
          onPress={() => void submit()}
        />
      </View>

      {mode === 'onboarding' ? (
        <SecondaryButton testID="btn-skip-account" label={t('nalog.skip')} onPress={finishOnboarding} />
      ) : null}

      <Caption style={styles.legal}>
        {t('nalog.legal.pre')}
        <Caption testID="link-terms" style={styles.link} onPress={() => router.push('/uslovi' as Href)}>
          {t('nalog.legal.terms')}
        </Caption>
        {t('nalog.legal.and')}
        <Caption testID="link-policy" style={styles.link} onPress={() => router.push('/privatnost' as Href)}>
          {t('nalog.legal.policy')}
        </Caption>
        {t('nalog.legal.end')}
      </Caption>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row' },
  head: { gap: 8 },
  bullets: { padding: 16, gap: 12 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  form: { gap: 14 },
  passwordInput: { paddingRight: 84 },
  toggle: {
    position: 'absolute',
    right: 12,
    bottom: 0,
    height: layout.minHit + 8,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  toggleLabel: { color: color.sunLink },
  error: { color: color.emberInk },
  legal: { textAlign: 'center' },
  link: { color: color.sunLink, textDecorationLine: 'underline' },
});
