import { ScreenScroll } from '@/components';
import { t } from '@/copy/sr';
import { ScreenHeader } from '@/features/profil/ScreenHeader';
import { PrivacySections } from '@/features/profil/PrivatnostContent';

export default function PrivatnostScreen() {
  return (
    <ScreenScroll testID="screen-privatnost" contentStyle={{ paddingTop: 12 }}>
      <ScreenHeader title={t('privatnost.title')} />
      <PrivacySections />
    </ScreenScroll>
  );
}
