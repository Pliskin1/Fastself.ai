import { NativeTabs } from 'expo-router/native-tabs';
import { t } from '@/copy/sr';

export default function TabsLayout() {
  return (
    <NativeTabs tintColor="#FFC86E">
      <NativeTabs.Trigger contentStyle={{ backgroundColor: 'transparent' }} name="danas">
        <NativeTabs.Trigger.Icon sf="sun.horizon" md="wb_twilight" />
        <NativeTabs.Trigger.Label>{t('nav.danas')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger contentStyle={{ backgroundColor: 'transparent' }} name="kalendar">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>{t('nav.kalendar')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger contentStyle={{ backgroundColor: 'transparent' }} name="plan">
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
        <NativeTabs.Trigger.Label>{t('nav.plan')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger contentStyle={{ backgroundColor: 'transparent' }} name="tajmer">
        <NativeTabs.Trigger.Icon sf="timer" md="timer" />
        <NativeTabs.Trigger.Label>{t('nav.tajmer')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger contentStyle={{ backgroundColor: 'transparent' }} name="profil">
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
        <NativeTabs.Trigger.Label>{t('nav.profil')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
