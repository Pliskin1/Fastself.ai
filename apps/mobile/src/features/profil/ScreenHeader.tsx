import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Display, IconButton } from '@/components';
import { t } from '@/copy/sr';

/** Title with a back button, for the screens pushed on top of the tabs (they have no native header). */
export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.wrap}>
      <IconButton
        testID="btn-back"
        icon="back"
        accessibilityLabel={t('common.back')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profil'))}
      />
      <Display>{title}</Display>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: 10 } });
