import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { registerDeviceToken } from '@/services/api/notificationApi';

const DEVICE_ID_KEY = 'nexora.notification_device_id';

function createDeviceId(): string {
  return `nexora-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

async function getDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existing) return existing;
    const created = createDeviceId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, created);
    return created;
  } catch (error) {
    console.warn('Unable to persist notification device ID.', error);
    return createDeviceId();
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function getDeviceToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const token = await Notifications.getDevicePushTokenAsync();
  return typeof token.data === 'string' ? token.data : null;
}

export async function registerCurrentDevice(): Promise<void> {
  try {
    const token = await getDeviceToken();
    if (!token) return;
    await registerDeviceToken({
      token,
      platform: Platform.OS === 'android' ? 'android' : 'ios',
      device_id: await getDeviceId(),
    });
  } catch (error) {
    console.warn('Notification registration unavailable.', error);
  }
}

export function configureNotificationHandling(onOpen: (screen?: string) => void): () => void {
  if (Platform.OS === 'web') return () => {};

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data ?? {};
    const screen = typeof data.screen === 'string' ? data.screen : undefined;
    onOpen(screen);
  });
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;
    const data = response.notification.request.content.data ?? {};
    onOpen(typeof data.screen === 'string' ? data.screen : undefined);
  });
  return () => subscription.remove();
}
