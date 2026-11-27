import { ScreenScroll } from '@/components';
import { t } from '@/copy/sr';
import { ScreenHeader } from '@/features/profil/ScreenHeader';
import { CityCard, ManualCorrection, MethodList } from '@/features/profil/VaktijaContent';

export default function VaktijaScreen() {
  return (
    <ScreenScroll testID="screen-vaktija">
      <ScreenHeader title={t('vaktija.title')} />
      <CityCard />
      <MethodList />
      <ManualCorrection />
    </ScreenScroll>
  );
}
