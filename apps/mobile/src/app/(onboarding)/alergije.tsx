import { t } from '@/copy/sr';
import { AlergijePicker, goNext, OnboardingScreen } from '@/features/onboarding';

export default function ObAlergijeScreen() {
  return (
    <OnboardingScreen
      testID="screen-ob-alergije"
      title={t('alergije.title')}
      sub={t('alergije.sub')}
      cta={t('common.next')}
      onNext={() => goNext('alergije')}
    >
      <AlergijePicker />
    </OnboardingScreen>
  );
}
