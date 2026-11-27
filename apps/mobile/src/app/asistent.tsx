import { Redirect, type Href } from 'expo-router';

// AI meal suggestions are not part of v1: the route exists for old links only and goes to Danas.
export default function HiddenScreen() {
  return <Redirect href={'/(tabs)/danas' as Href} />;
}
