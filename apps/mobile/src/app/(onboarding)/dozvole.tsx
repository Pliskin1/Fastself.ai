import { CITIES, type CityId } from '@fastself/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Body, Caption, Chip, GlassCard, SecondaryButton, Title } from '@/components';
import { t } from '@/copy/sr';
import { goNext, OnboardingScreen } from '@/features/onboarding';
import { useSettings, useUpdateSettings } from '@/hooks';
import { nearestCity } from '@/lib/location';
import { ensureNotificationPermission } from '@/notifications/permissions';

type NotifState = 'idle' | 'on' | 'denied';

/** The only step that asks for permissions, and only when the user taps a button. Both are optional. */
export default function ObDozvoleScreen() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const needsCity = settings.practices.ramadan || settings.practices.nafila;
  const [picked, setPicked] = useState(false);
  const [denied, setDenied] = useState(false);
  const [manual, setManual] = useState(false);
  const [notif, setNotif] = useState<NotifState>('idle');

  const useLocation = async () => {
    const city = await nearestCity();
    if (city) {
      update({ city });
      setPicked(true);
      setDenied(false);
    } else {
      setDenied(true);
      setManual(true);
    }
  };

  const chooseCity = (city: CityId) => {
    update({ city });
    setPicked(true);
  };

  const askNotifications = async () => setNotif((await ensureNotificationPermission()) ? 'on' : 'denied');

  return (
    <OnboardingScreen
      testID="screen-ob-dozvole"
      title={t('dozvole.title')}
      sub={t('dozvole.sub')}
      cta={t('common.next')}
      onNext={() => goNext('dozvole')}
    >
      {needsCity ? (
        <GlassCard contentStyle={styles.card}>
          <Body>{t('dozvole.city.body')}</Body>
          <SecondaryButton testID="btn-location" label={t('dozvole.city.useLocation')} onPress={useLocation} />
          <SecondaryButton
            testID="btn-city-manual"
            label={t('dozvole.city.manual')}
            onPress={() => setManual((v) => !v)}
          />
          {denied ? <Caption>{t('dozvole.city.denied')}</Caption> : null}
          {manual ? (
            <View style={styles.chips}>
              {(Object.keys(CITIES) as CityId[]).map((id) => (
                <Chip
                  key={id}
                  variant="toggle"
                  testID={`chip-city-${id}`}
                  label={CITIES[id].name}
                  selected={picked && settings.city === id}
                  onPress={() => chooseCity(id)}
                />
              ))}
            </View>
          ) : null}
          {picked ? <Body tone="mist">{t('dozvole.city.picked', { city: CITIES[settings.city].name })}</Body> : null}
        </GlassCard>
      ) : (
        <Body tone="mist">{t('dozvole.city.notNeeded')}</Body>
      )}

      <GlassCard contentStyle={styles.card}>
        <Title>{t('dozvole.notif.title')}</Title>
        <Body tone="mist">{t('dozvole.notif.body')}</Body>
        <SecondaryButton
          testID="btn-notif"
          tone={notif === 'on' ? 'teal' : undefined}
          label={notif === 'on' ? t('dozvole.notif.on') : t('dozvole.notif.allow')}
          onPress={askNotifications}
        />
        {notif === 'denied' ? <Caption>{t('dozvole.notif.denied')}</Caption> : null}
      </GlassCard>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
