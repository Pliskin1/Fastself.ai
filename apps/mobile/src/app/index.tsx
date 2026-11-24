import { Redirect, type Href } from 'expo-router';
import { useSettings } from '@/hooks';

export default function Index() {
  const { onboarded } = useSettings();
  return <Redirect href={(onboarded ? '/(tabs)/danas' : '/(onboarding)/welcome') as Href} />;
}
