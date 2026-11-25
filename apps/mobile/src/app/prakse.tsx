import { router } from 'expo-router';
import { PrimaryButton, ScreenScroll, useToast } from '@/components';
import { t } from '@/copy/sr';
import { ScreenHeader } from '@/features/profil/ScreenHeader';
import { PraksePicker } from '@/features/onboarding';

export default function PrakseScreen() {
  const toast = useToast();
  return (
    <ScreenScroll testID="screen-prakse" contentStyle={{ paddingTop: 12 }}>
      <ScreenHeader title={t('prakse.title')} />
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
