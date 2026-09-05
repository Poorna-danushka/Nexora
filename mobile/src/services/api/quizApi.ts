import apiClient from './apiClient';
import type { GeneratedQuizResponse } from '@/types/ai';

export type QuizQuestion = { id: number; quiz_id: number; prompt: string; options: string[]; correct_option: number; position: number };
export type Quiz = { id: number; owner_id: number; subject_id: number; title: string; description?: string; questions?: QuizQuestion[]; created_at: string; updated_at: string };
export type Attempt = { id: number; quiz_id: number; owner_id: number; score: number; total: number; answers: Record<string, number>; completed_at: string };
export const getQuizzes = async () => (await apiClient.get<Quiz[]>('/quizzes')).data;
export const getQuiz = async (id: number) => (await apiClient.get<Quiz>(`/quizzes/${id}`)).data;
export const deleteQuiz = async (id: number): Promise<void> => {
  await apiClient.delete(`/quizzes/${id}`);
};
export const updateQuiz = async (id: number, data: { subject_id?: number; title?: string; description?: string }) =>
  (await apiClient.patch<Quiz>(`/quizzes/${id}`, data)).data;
export const createQuiz = async (data: { subject_id: number; title: string; description?: string }) => (await apiClient.post<Quiz>('/quizzes', data)).data;
export const addQuestion = async (quizId: number, data: { prompt: string; options: string[]; correct_option: number; position?: number }) => (await apiClient.post<QuizQuestion>(`/quizzes/${quizId}/questions`, data)).data;
export const submitAttempt = async (quizId: number, answers: Record<number, number>) => (await apiClient.post<Attempt>(`/quizzes/${quizId}/attempts`, { answers })).data;
export const getAttemptHistory = async (quizId: number) => (await apiClient.get<Attempt[]>(`/quizzes/${quizId}/attempts`)).data;
export const saveGeneratedQuiz = async (subjectId: number, quiz: GeneratedQuizResponse) =>
  (await apiClient.post<Quiz>('/quizzes/save-generated', { subject_id: subjectId, quiz })).data;
