import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'nexora.access_token';

export const getAccessToken = () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

export const saveAccessToken = (token: string) =>
  SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);

export const clearAccessToken = () => SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
