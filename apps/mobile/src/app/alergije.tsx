import { router } from 'expo-router';
import { PrimaryButton, ScreenScroll, useToast } from '@/components';
import { t } from '@/copy/sr';
import { ScreenHeader } from '@/features/profil/ScreenHeader';
import { AlergijePicker } from '@/features/onboarding';

export default function AlergijeScreen() {
  const toast = useToast();
  return (
    <ScreenScroll testID="screen-alergije" keyboardShouldPersistTaps="handled">
      <ScreenHeader title={t('alergije.title')} />
      <AlergijePicker />
      <PrimaryButton
        testID="btn-save"
        label={t('common.save')}
        onPress={() => {
          toast.show(t('alergije.saved'));
          router.back();
        }}
      />
    </ScreenScroll>
  );
}
