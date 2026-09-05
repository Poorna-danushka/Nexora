import apiClient from './apiClient';

export type NotificationHistoryItem = {
  id: number;
  title: string;
  body: string;
  notification_type: string;
  data: Record<string, string> | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type NotificationHistoryResponse = {
  items: NotificationHistoryItem[];
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
};

export const getNotifications = async (params?: {
  page?: number;
  limit?: number;
  unread_only?: boolean;
}): Promise<NotificationHistoryResponse> =>
  (await apiClient.get<NotificationHistoryResponse>('/notifications/history', { params })).data;

export const getUnreadNotificationCount = async (): Promise<number> =>
  (await apiClient.get<{ count: number }>('/notifications/history/unread-count')).data.count;

export const markNotificationAsRead = async (
  id: number
): Promise<NotificationHistoryItem> =>
  (await apiClient.patch<NotificationHistoryItem>(`/notifications/history/${id}/read`)).data;

export const markAllNotificationsAsRead = async (): Promise<number> =>
  (await apiClient.patch<{ updated: number }>('/notifications/history/read-all')).data.updated;
