import apiClient from './apiClient';

export type Subject = {
  id: number;
  owner_id: number;
  name: string;
  description?: string;
  color: string;
  progress: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type SubjectInput = {
  name: string;
  description?: string;
  color?: string;
  progress?: number;
  is_completed?: boolean;
};

export const getSubjects = async (): Promise<Subject[]> =>
  (await apiClient.get<Subject[]>('/subjects')).data;

export const createSubject = async (data: SubjectInput): Promise<Subject> =>
  (await apiClient.post<Subject>('/subjects', data)).data;

export const updateSubject = async (id: number, data: Partial<SubjectInput>): Promise<Subject> =>
  (await apiClient.patch<Subject>(`/subjects/${id}`, data)).data;

export const deleteSubject = async (id: number): Promise<void> => {
  await apiClient.delete(`/subjects/${id}`);
};
