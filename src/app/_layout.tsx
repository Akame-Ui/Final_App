import { Redirect, Stack, useSegments } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { completeAuthFromUrl } from '@/lib/auth';
import { useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    void SplashScreen.hideAsync();

    const handleUrl = ({ url }: { url: string }) => {
      void completeAuthFromUrl(url);
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    void Linking.getInitialURL().then((url) => {
      if (url) void completeAuthFromUrl(url);
    });

    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const path = segments[0];
  const inAuthGroup = path === 'login' || path === 'register';
  const inTabsGroup = path === '(tabs)';

  return (
    <Stack initialRouteName="login" screenOptions={{ headerShown: false }}>
      {!session && inTabsGroup && <Redirect href={'/login' as RelativePathString} />}
      {session && inAuthGroup && <Redirect href={'/(tabs)' as RelativePathString} />}
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
