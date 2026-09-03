import apiClient from './apiClient';

export type StudySession = {
  id: number;
  owner_id: number;
  subject_id?: number;
  title: string;
  scheduled_for: string;
  duration_minutes: number;
  is_completed: boolean;
  created_at: string;
};

export type StudyGoal = {
  id: number;
  owner_id: number;
  subject_id?: number;
  title: string;
  target_date?: string;
  is_completed: boolean;
  created_at: string;
};

export const getStudySessions = async () =>
  (await apiClient.get<StudySession[]>('/study-sessions')).data;
export const createStudySession = async (data: Omit<StudySession, 'id' | 'owner_id' | 'created_at'>) =>
  (await apiClient.post<StudySession>('/study-sessions', data)).data;
export const completeStudySession = async (id: number) =>
  (await apiClient.patch<StudySession>(`/study-sessions/${id}`, { is_completed: true })).data;
export const deleteStudySession = async (id: number) => {
  await apiClient.delete(`/study-sessions/${id}`);
};

export const getStudyGoals = async () =>
  (await apiClient.get<StudyGoal[]>('/study-goals')).data;
export const createStudyGoal = async (data: Omit<StudyGoal, 'id' | 'owner_id' | 'created_at'>) =>
  (await apiClient.post<StudyGoal>('/study-goals', data)).data;
export const completeStudyGoal = async (id: number) =>
  (await apiClient.patch<StudyGoal>(`/study-goals/${id}`, { is_completed: true })).data;
export const deleteStudyGoal = async (id: number) => {
  await apiClient.delete(`/study-goals/${id}`);
};
