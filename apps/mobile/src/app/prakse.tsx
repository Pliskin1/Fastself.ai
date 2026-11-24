import { router } from 'expo-router';
import { Display, PrimaryButton, ScreenScroll, useToast } from '@/components';
import { t } from '@/copy/sr';
import { PraksePicker } from '@/features/onboarding';

export default function PrakseScreen() {
  const toast = useToast();
  return (
    <ScreenScroll testID="screen-prakse" contentStyle={{ paddingTop: 12 }}>
      <Display>{t('prakse.title')}</Display>
      <PraksePicker />
      <PrimaryButton
        testID="btn-save"
        label={t('common.save')}
        onPress={() => {
          toast.show(t('prakse.saved'));
          router.back();
        }}
      />
    </ScreenScroll>
  );
}
