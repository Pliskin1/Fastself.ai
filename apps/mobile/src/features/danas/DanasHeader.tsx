import { longDate, type DayNum } from '@fastself/core';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from '@/components';
import { t } from '@/copy/sr';

/** The date and the sync status button. Sync does not exist yet, so the state is always "only on the phone". */
export function DanasHeader({ today }: { today: DayNum }) {
  return (
    <View style={styles.row}>
      <Text variant="bodyStrong" tone="mist">
        {longDate(today)}
      </Text>
      <IconButton
        testID="btn-sync-status"
        icon="sync"
        accessibilityLabel={t('a11y.syncStatus', { state: t('danas.sync.local') })}
        onPress={() => router.push('/(tabs)/profil' as Href)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
