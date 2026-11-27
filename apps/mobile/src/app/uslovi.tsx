import { ScreenScroll } from '@/components';
import { t } from '@/copy/sr';
import { TermsContent } from '@/features/legal/TermsContent';
import { ScreenHeader } from '@/features/profil/ScreenHeader';

export default function UsloviScreen() {
  return (
    <ScreenScroll testID="screen-uslovi">
      <ScreenHeader title={t('uslovi.title')} />
      <TermsContent />
    </ScreenScroll>
  );
}
