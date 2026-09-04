import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'nexora.access_token';

const getWebStorage = () => {
  if (Platform.OS !== 'web' || typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage;
};

export const getAccessToken = () => {
  const storage = getWebStorage();
  return storage
    ? Promise.resolve(storage.getItem(ACCESS_TOKEN_KEY))
    : SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
};

export const saveAccessToken = async (token: string) => {
  const storage = getWebStorage();
  if (storage) {
    storage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
};

export const clearAccessToken = async () => {
  const storage = getWebStorage();
  if (storage) {
    storage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch (error: unknown) {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.removeItem(ACCESS_TOKEN_KEY);
      return;
    }
    throw error;
  }
};
