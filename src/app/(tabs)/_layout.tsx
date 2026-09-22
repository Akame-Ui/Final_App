import { Redirect } from 'expo-router';
import type { RelativePathString } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useAuth } from '@/lib/auth';

export default function TabLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href={'/login' as RelativePathString} />;
  }

  return <AppTabs />;
}