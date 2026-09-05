// ─── Nexora Mobile — Centralized AI API Service ──────────────────────────────
//
// All AI network calls live here. Screens import from this module — never
// call the AI endpoints directly from a screen or component.
//
// Security: this module calls OUR FastAPI backend (/notes/…, /study-materials/…,
// etc.). No OpenAI API key is present in mobile code at any point.
//
// The existing authenticated apiClient is reused; the Bearer token is injected
// automatically by its request interceptor.

import axios from 'axios';
import apiClient from './apiClient';
import type {
  AIErrorKind,
  GeneratedQuizResponse,
  MaterialQuestionRequest,
  MaterialQuestionResponse,
  NoteSummaryResponse,
  QuizGenerationRequest,
  StudyPlanRequest,
  StudyPlanResponse,
  AIConversation,
  AIMessage,
  PracticeQuestionResponse,
} from '@/types/ai';

export type { AIErrorKind };


// ─── Error Normalizer ─────────────────────────────────────────────────────────
/**
 * Converts any thrown value into a typed AIErrorKind.
 * 401/403 are intentionally NOT mapped here — callers should handle those
 * by calling signOut() since they indicate an expired/invalid session.
 */
export function parseAIError(err: unknown): AIErrorKind {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 429) return 'rate_limit';
    if (status === 422) return 'validation';
    if (status === 404) return 'not_found';
    if (status === 502 || status === 503) return 'server';
    if (!err.response) return 'network'; // timeout / no response
  }
  return 'unknown';
}

/**
 * Returns true if the error is an auth error (401/403) that should trigger
 * a sign-out rather than an inline AI error state.
 */
export function isAuthError(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    return status === 401 || status === 403;
  }
  return false;
}

// ─── Human-readable messages per error kind ───────────────────────────────────
export const AI_ERROR_MESSAGES: Record<AIErrorKind, string> = {
  rate_limit: 'Rolling 24-hour AI limit reached (20 requests). Try again later.',
  validation:  'Your request contained invalid data. Please check your input.',
  not_found:   'The content could not be found. It may have been deleted.',
  server:      'The AI service is temporarily unavailable. Please try again later.',
  network:     'Network error. Please check your connection and try again.',
  unknown:     'Something went wrong. Please try again.',
};

// ─── 1. Note Summarization ────────────────────────────────────────────────────
/**
 * POST /notes/{note_id}/summarize
 * Generates a summary of the note's content using AI.
 * The summary is NOT persisted — it is returned for display only.
 */
export async function summarizeNote(noteId: number): Promise<NoteSummaryResponse> {
  const response = await apiClient.post<NoteSummaryResponse>(
    `/notes/${noteId}/summarize`
  );
  return response.data;
}

// ─── 2. Study-Material Q&A ───────────────────────────────────────────────────
/**
 * POST /study-materials/{material_id}/ask
 * Answers a question about the uploaded study material using AI.
 */
export async function askMaterial(
  materialId: number,
  question: string
): Promise<MaterialQuestionResponse> {
  const body: MaterialQuestionRequest = { question };
  const response = await apiClient.post<MaterialQuestionResponse>(
    `/study-materials/${materialId}/ask`,
    body
  );
  return response.data;
}

// ─── 3. AI Study Plan Generation ─────────────────────────────────────────────
/**
 * POST /study-plans/generate
 * Generates a textual study plan based on subjects, goals, and sessions.
 * The plan is NOT persisted — display only.
 */
export async function generateStudyPlan(
  req: StudyPlanRequest
): Promise<StudyPlanResponse> {
  const response = await apiClient.post<StudyPlanResponse>(
    '/study-plans/generate',
    req
  );
  return response.data;
}

// ─── 4. AI Quiz Generation ────────────────────────────────────────────────────
/**
 * POST /quizzes/generate
 * Generates a quiz preview from a subject or study material.
 * The result is NOT automatically saved — user must explicitly save it.
 * Exactly one of subject_id or material_id must be provided.
 */
export async function generateQuiz(
  req: QuizGenerationRequest
): Promise<GeneratedQuizResponse> {
  const response = await apiClient.post<GeneratedQuizResponse>(
    '/quizzes/generate',
    req
  );
  return response.data;
}

export async function generatePracticeQuestion(
  req: Omit<QuizGenerationRequest, 'question_count'>,
): Promise<PracticeQuestionResponse> {
  const response = await apiClient.post<PracticeQuestionResponse>(
    '/quizzes/generate-question',
    req,
  );
  return response.data;
}

export async function createAIConversation(title = 'New conversation'): Promise<AIConversation> {
  const response = await apiClient.post<AIConversation>('/ai/conversations', { title });
  return response.data;
}

export async function getAIConversations(): Promise<AIConversation[]> {
  const response = await apiClient.get<AIConversation[]>('/ai/conversations');
  return response.data;
}

export async function renameAIConversation(id: number, title: string): Promise<AIConversation> {
  const response = await apiClient.patch<AIConversation>(`/ai/conversations/${id}`, { title });
  return response.data;
}

export async function deleteAIConversation(id: number): Promise<void> {
  await apiClient.delete(`/ai/conversations/${id}`);
}

export async function getAIMessages(id: number): Promise<AIMessage[]> {
  const response = await apiClient.get<AIMessage[]>(`/ai/conversations/${id}/messages`);
  return response.data;
}

export async function sendAIMessage(id: number, content: string): Promise<AIMessage[]> {
  const response = await apiClient.post<AIMessage[]>(
    `/ai/conversations/${id}/messages`,
    { content },
  );
  return response.data;
}
