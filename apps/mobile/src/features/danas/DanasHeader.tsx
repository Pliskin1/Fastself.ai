import { longDate, type DayNum } from '@fastself/core';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from '@/components';
import { t } from '@/copy/sr';
import { useSyncStatus, type SyncStatus } from '@/sync';

const SYNC_LABEL: Record<SyncStatus, string> = {
  off: 'danas.sync.local',
  idle: 'danas.sync.on',
  syncing: 'danas.sync.syncing',
  error: 'danas.sync.error',
};

/** The date and the sync status button, which names the sync state and opens Profil. */
export function DanasHeader({ today }: { today: DayNum }) {
  const status = useSyncStatus();
  return (
    <View style={styles.row}>
      <Text variant="bodyStrong" tone="mist">
        {longDate(today)}
      </Text>
      <IconButton
        testID="btn-sync-status"
        icon="sync"
        accessibilityLabel={t('a11y.syncStatus', { state: t(SYNC_LABEL[status]) })}
        onPress={() => router.push('/(tabs)/profil' as Href)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
