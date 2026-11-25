import Animated from 'react-native-reanimated';
import { Display, ScreenScroll, useMotion } from '@/components';
import { t } from '@/copy/sr';
import {
  AccountCard,
  FastGroup,
  Footer,
  HelpGroup,
  PrivacyGroup,
  RemindersGroup,
} from '@/features/profil/ProfilContent';

export default function ProfilScreen() {
  const { enter } = useMotion();
  return (
    <ScreenScroll testID="screen-profil" bottomInset={80} sky>
      <Animated.View entering={enter(0)}>
        <Display>{t('profil.title')}</Display>
      </Animated.View>
      <Animated.View entering={enter(1)} style={{ gap: 18 }}>
        <AccountCard />
        <FastGroup />
        <RemindersGroup />
        <PrivacyGroup />
        <HelpGroup />
        <Footer />
      </Animated.View>
    </ScreenScroll>
  );
}
