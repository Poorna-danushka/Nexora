import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Platform, StatusBar, View, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import {
  configureNotificationHandling,
  registerCurrentDevice,
} from '@/services/notifications/notificationService';

SplashScreen.preventAutoHideAsync();

const ONBOARDING_KEY = 'nexora.onboarding_done';

async function getOnboardingDone(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(ONBOARDING_KEY) === 'true';
  }
  try {
    const val = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return val === 'true';
  } catch (error) {
    console.warn('Unable to read onboarding completion.', error);
    return false;
  }
}

// ─── Inner layout — has access to AuthContext ─────────────────────────────────
function RootLayoutNav() {
  const { status } = useAuth();
  const router = useRouter();
  const [splashHidden, setSplashHidden] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const notificationAttempted = useRef(false);

  useEffect(() => configureNotificationHandling((screen) => {
    if (screen === 'study') {
      router.push('/planning');
      return;
    }
    router.push('/');
  }), [router]);

  // Load onboarding flag once
  useEffect(() => {
    getOnboardingDone().then(setOnboardingDone);
  }, []);

  // Track the previous status so we only redirect on genuine transitions
  const prevStatus = useRef<string>('loading');

  // React to auth status changes (login, logout, initial load)
  useEffect(() => {
    if (status === 'loading') return;
    if (onboardingDone === null) return; // still reading onboarding flag

    const prev = prevStatus.current;
    prevStatus.current = status;

    if (status === 'authenticated') {
      // Only navigate to home on first resolution (loading→authenticated) or
      // after a login (unauthenticated→authenticated). Never re-run if already there.
      if (prev === 'loading' || prev === 'unauthenticated') {
        router.replace('/');
      }
    } else {
      // Token cleared — always redirect to auth entry point
      if (onboardingDone) {
        router.replace('/auth');
      } else {
        router.replace('/welcome');
      }
    }
  }, [status, onboardingDone, router]);

  useEffect(() => {
    if (status !== 'authenticated' || notificationAttempted.current) return;
    notificationAttempted.current = true;
    void registerCurrentDevice();
  }, [status]);

  // Hide splash once we know the auth state
  useEffect(() => {
    if (status !== 'loading' && onboardingDone !== null && !splashHidden) {
      setSplashHidden(true);
      SplashScreen.hideAsync();
    }
  }, [status, onboardingDone, splashHidden]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      {/* Entry flow */}
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="auth" options={{ animation: 'fade' }} />

      {/* Auth */}
      <Stack.Screen name="login" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="register" options={{ animation: 'slide_from_bottom' }} />

      {/* Main app tabs */}
      <Stack.Screen name="(tabs)" />

      {/* Feature screens */}
      <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="subjects" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="subjects/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="notes" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="notes/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="materials" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="planning" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="calendar" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="quizzes" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="quiz/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ai" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

// ─── Root export — wraps everything in AuthProvider ───────────────────────────
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: Colors.bg },
});
