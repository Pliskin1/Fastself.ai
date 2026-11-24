import { t } from '@/copy/sr';
import { canContinue, goNext, OnboardingScreen, PraksePicker } from '@/features/onboarding';
import { useSettings } from '@/hooks';

export default function ObPrakseScreen() {
  const settings = useSettings();
  return (
    <OnboardingScreen
      testID="screen-ob-prakse"
      title={t('prakse.title')}
      sub={t('prakse.sub')}
      cta={t('common.next')}
      disabled={!canContinue('prakse', settings)}
      onNext={() => goNext('prakse')}
    >
      <PraksePicker />
    </OnboardingScreen>
  );
}
