import { useLocalSearchParams } from 'expo-router';
import { AccountFlow } from '@/features/onboarding';

export default function ObNalogScreen() {
  const { returning } = useLocalSearchParams<{ returning?: string }>();
  return <AccountFlow mode="onboarding" returning={returning === '1'} testID="screen-ob-nalog" />;
}
