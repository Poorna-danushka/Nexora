import apiClient from './apiClient';

export type CalendarEvent = {
  id: number;
  owner_id: number;
  subject_id?: number;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  reminder_minutes?: number;
  created_at: string;
};

export type CalendarEventInput = Omit<CalendarEvent, 'id' | 'owner_id' | 'created_at'>;

export const getCalendarEvents = async (upcomingOnly = false) =>
  (await apiClient.get<CalendarEvent[]>('/calendar-events', {
    params: { upcoming_only: upcomingOnly },
  })).data;

export const createCalendarEvent = async (data: CalendarEventInput) =>
  (await apiClient.post<CalendarEvent>('/calendar-events', data)).data;

export const deleteCalendarEvent = async (id: number) => {
  await apiClient.delete(`/calendar-events/${id}`);
};
