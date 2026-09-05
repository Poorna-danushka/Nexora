// ─── Nexora Mobile — AI Type Definitions ────────────────────────────────────
// Mirrors backend/app/schemas/ai.py exactly.
// Import from '@/types/ai' in services and components.

// ─── Note Summarization ───────────────────────────────────────────────────────
/** Response from POST /notes/{note_id}/summarize */
export interface NoteSummaryResponse {
  note_id: number;
  summary: string;
}

// ─── Study-Material Q&A ───────────────────────────────────────────────────────
/** Request body for POST /study-materials/{material_id}/ask */
export interface MaterialQuestionRequest {
  question: string;
}

/** Response from POST /study-materials/{material_id}/ask */
export interface MaterialQuestionResponse {
  material_id: number;
  answer: string;
}

// ─── AI Study-Plan Generation ─────────────────────────────────────────────────
/** Request body for POST /study-plans/generate
 *  - subject_ids: [] means all subjects
 *  - days: 1–30 (default 7)
 *  - minutes_per_day: 15–480 (default 60)
 *  - priorities: optional free-text up to 2000 chars
 */
export interface StudyPlanRequest {
  subject_ids?: number[];
  days?: number;
  minutes_per_day?: number;
  priorities?: string;
}

/** Response from POST /study-plans/generate */
export interface StudyPlanResponse {
  id?: number;
  plan: string;
  title?: string;
  subject_ids?: number[];
  days?: number;
  minutes_per_day?: number;
  priorities?: string;
}

export interface AIConversation {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ─── AI Quiz Generation ───────────────────────────────────────────────────────
/** Request body for POST /quizzes/generate
 *  Exactly one of subject_id or material_id must be provided.
 *  - question_count: 1–20 (default 5)
 *  - topic: optional hint up to 500 chars
 */
export interface QuizGenerationRequest {
  subject_id?: number;
  material_id?: number;
  question_count?: number;
  topic?: string;
}

/** A single generated quiz question (not persisted) */
export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export type PracticeQuestionResponse = GeneratedQuizQuestion;

export interface QuizExplanationResponse {
  quiz_id: number;
  question_id: number;
  explanation: string;
}

/** Response from POST /quizzes/generate (ephemeral — not saved to DB) */
export interface GeneratedQuizResponse {
  title: string;
  questions: GeneratedQuizQuestion[];
}

// ─── Shared AI Error Type ─────────────────────────────────────────────────────
/**
 * Normalised error kind returned by parseAIError().
 *
 * rate_limit  — HTTP 429, rolling 24-hour quota exhausted
 * validation  — HTTP 422, invalid request payload
 * not_found   — HTTP 404, resource doesn't exist / file missing
 * server      — HTTP 502/503, upstream AI error or not configured
 * network     — timeout or no response
 * unknown     — anything else
 */
export type AIErrorKind =
  | 'rate_limit'
  | 'validation'
  | 'not_found'
  | 'server'
  | 'network'
  | 'unknown';
