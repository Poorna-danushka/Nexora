import apiClient from './apiClient';

export type DevicePlatform = 'android' | 'ios' | 'web';

export type DeviceTokenRegistration = {
  token: string;
  platform: DevicePlatform;
  device_id?: string;
};

export const registerDeviceToken = async (
  registration: DeviceTokenRegistration
): Promise<void> => {
  await apiClient.post('/notifications/devices', registration);
};

export const unregisterDeviceToken = async (token: string): Promise<void> => {
  await apiClient.delete(`/notifications/devices/${encodeURIComponent(token)}`);
};
