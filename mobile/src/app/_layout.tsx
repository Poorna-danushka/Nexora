import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The tab group — Home tab */}
      <Stack.Screen name="(tabs)" />

      {/* Register screen — full-screen, outside tabs */}
      <Stack.Screen name="register" />
      <Stack.Screen name="login" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="subjects" />
    </Stack>
  );
}
