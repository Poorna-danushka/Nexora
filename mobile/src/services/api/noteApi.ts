import apiClient from './apiClient';

export type Note = {
  id: number;
  owner_id: number;
  subject_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type NoteInput = {
  subject_id: number;
  title: string;
  content: string;
};

export const getNotes = async (subjectId?: number): Promise<Note[]> =>
  (await apiClient.get<Note[]>('/notes', { params: { subject_id: subjectId } })).data;

export const createNote = async (data: NoteInput): Promise<Note> =>
  (await apiClient.post<Note>('/notes', data)).data;

export const updateNote = async (id: number, data: Partial<NoteInput>): Promise<Note> =>
  (await apiClient.patch<Note>(`/notes/${id}`, data)).data;

export const deleteNote = async (id: number): Promise<void> => {
  await apiClient.delete(`/notes/${id}`);
};
