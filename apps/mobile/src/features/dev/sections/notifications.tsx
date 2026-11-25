import { formatHm, localFromEpoch, shortDate } from '@fastself/core';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Body, Caption, GlassCard, SecondaryButton, useToast } from '@/components';
import { t } from '@/copy/sr';
import { listScheduled, rescheduleAll, sendTestNotification, type ScheduledItem } from '@/notifications';

/** "2.12. 20:00" on the Podgorica calendar. */
function when(at: number | null): string {
  if (at === null) return '';
  const { n, minutes } = localFromEpoch(at);
  return `${shortDate(n)} ${formatHm(minutes)}`;
}

/** Dev screen section: what is pending in the system, a test notification and a manual reschedule. */
export default function NotificationsSection() {
  const toast = useToast();
  const [items, setItems] = useState<ScheduledItem[]>([]);

  const refresh = async () => setItems(await listScheduled());

  useEffect(() => {
    let alive = true;
    listScheduled().then((list) => {
      if (alive) setItems(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const sendTest = async () => {
    const sent = await sendTestNotification();
    toast.show(t(sent ? 'notif.dev.sent' : 'notif.dev.denied'));
    await refresh();
  };

  const reschedule = async () => {
    await rescheduleAll();
    await refresh();
  };

  return (
    <View style={{ gap: 10 }} testID="dev-notifications">
      <Caption>{t('notif.dev.title')}</Caption>
      <GlassCard contentStyle={{ padding: 18, gap: 12 }}>
        <Body tone="mist" testID="dev-notif-count">
          {items.length > 0 ? t('notif.dev.count', { n: items.length }) : t('notif.dev.empty')}
        </Body>
        {items.map((item) => (
          <View key={item.id} style={{ gap: 2 }} testID={`dev-notif-${item.id}`}>
            <Body>{item.title}</Body>
            <Caption>{[when(item.at), item.id].filter(Boolean).join('  ')}</Caption>
          </View>
        ))}
      </GlassCard>
      <SecondaryButton label={t('notif.dev.test')} onPress={sendTest} testID="dev-notif-test" />
      <SecondaryButton label={t('notif.dev.reschedule')} onPress={reschedule} testID="dev-notif-reschedule" />
    </View>
  );
}
