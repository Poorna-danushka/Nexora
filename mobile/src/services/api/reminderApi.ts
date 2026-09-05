import apiClient from './apiClient';

export type ReminderType =
  | 'study'
  | 'assignment'
  | 'exam'
  | 'interview'
  | 'job_application'
  | 'task'
  | 'general';

export type ReminderStatus = 'scheduled' | 'completed' | 'cancelled';

export type Reminder = {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  reminder_type: ReminderType;
  scheduled_at: string;
  timezone: string;
  status: ReminderStatus;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
};

export type ReminderInput = {
  title: string;
  description?: string | null;
  reminder_type: ReminderType;
  scheduled_at: string;
  timezone: string;
};

export type ReminderUpdate = Partial<ReminderInput> & {
  status?: ReminderStatus;
};

export const createReminder = async (data: ReminderInput): Promise<Reminder> =>
  (await apiClient.post<Reminder>('/reminders', data)).data;

export const getReminders = async (params?: {
  status?: ReminderStatus;
  reminder_type?: ReminderType;
  upcoming?: boolean;
}): Promise<Reminder[]> =>
  (await apiClient.get<Reminder[]>('/reminders', { params })).data;

export const getReminder = async (id: number): Promise<Reminder> =>
  (await apiClient.get<Reminder>(`/reminders/${id}`)).data;

export const updateReminder = async (id: number, data: ReminderUpdate): Promise<Reminder> =>
  (await apiClient.patch<Reminder>(`/reminders/${id}`, data)).data;

export const deleteReminder = async (id: number): Promise<void> => {
  await apiClient.delete(`/reminders/${id}`);
};
