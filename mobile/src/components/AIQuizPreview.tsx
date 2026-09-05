// ─── AIQuizPreview ────────────────────────────────────────────────────────────
// Displays the result of POST /quizzes/generate.
// Each generated question shows:
//   • numbered options
//   • correct answer highlighted in green
//   • collapsible explanation
// A "Preview only — not saved" badge is shown prominently.
// The quiz is NEVER auto-persisted; the backend returns ephemeral data.

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Button, Message, SkeletonLine } from '@/components/ui';
import { AIRateLimitBanner } from '@/components/AIRateLimitBanner';
import { AI_ERROR_MESSAGES, type AIErrorKind } from '@/services/api/aiApi';
import type { GeneratedQuizResponse } from '@/types/ai';

// ─── Question Row ─────────────────────────────────────────────────────────────
function QuizQuestionRow({
  index,
  question,
  options,
  correct_answer,
  explanation,
}: {
  index: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <View style={qStyles.block}>
      {/* Question number + text */}
      <View style={qStyles.questionRow}>
        <View style={qStyles.numBadge}>
          <Text style={qStyles.numText}>{index + 1}</Text>
        </View>
        <Text style={qStyles.questionText}>{question}</Text>
      </View>

      {/* Options */}
      <View style={qStyles.optionsList}>
        {options.map((opt, i) => {
          const isCorrect = opt === correct_answer;
          return (
            <View
              key={i}
              style={[qStyles.option, isCorrect && qStyles.optionCorrect]}
              accessibilityLabel={
                isCorrect ? `Option ${OPTION_LETTERS[i]}: ${opt} — correct answer` : `Option ${OPTION_LETTERS[i]}: ${opt}`
              }
            >
              <View style={[qStyles.optLetter, isCorrect && qStyles.optLetterCorrect]}>
                <Text style={[qStyles.optLetterText, isCorrect && qStyles.optLetterTextCorrect]}>
                  {OPTION_LETTERS[i] ?? String(i + 1)}
                </Text>
              </View>
              <Text style={[qStyles.optText, isCorrect && qStyles.optTextCorrect]} numberOfLines={4}>
                {opt}
              </Text>
              {isCorrect && <Text style={qStyles.checkIcon}>✓</Text>}
            </View>
          );
        })}
      </View>

      {/* Explanation toggle */}
      <Pressable
        onPress={() => setShowExplanation((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={showExplanation ? 'Hide explanation' : 'Show explanation'}
      >
        <Text style={qStyles.explToggle}>
          {showExplanation ? '▴ Hide explanation' : '▾ Show explanation'}
        </Text>
      </Pressable>

      {showExplanation && (
        <View style={qStyles.explBox}>
          <Text style={qStyles.explText}>{explanation}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface AIQuizPreviewProps {
  quiz: GeneratedQuizResponse | null;
  loading: boolean;
  error: AIErrorKind | null;
  onDismiss?: () => void;
  onSave?: () => void;
  saving?: boolean;
}

export function AIQuizPreview({
  quiz,
  loading,
  error,
  onDismiss,
  onSave,
  saving = false,
}: AIQuizPreviewProps) {
  if (!loading && !error && !quiz) return null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>✦</Text>
          <Text style={styles.badgeText}>AI Quiz Preview</Text>
        </View>
        {onDismiss && !loading && (
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Dismiss quiz preview"
          >
            <Text style={styles.dismiss}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* "Not saved" disclaimer */}
      <View style={styles.notSavedBanner}>
        <Text style={styles.notSavedText}>Preview only — not saved to your quizzes</Text>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.skeletonWrap}>
          <SkeletonLine width="60%" height={16} />
          <SkeletonLine width="95%" height={13} />
          <SkeletonLine width="88%" height={13} />
          <SkeletonLine width="78%" height={13} />
          <SkeletonLine width="83%" height={13} />
          <SkeletonLine width="40%" height={11} style={{ marginTop: Spacing.sm }} />
        </View>
      )}

      {/* Error */}
      {!loading && error && (
        <View style={styles.errorWrap}>
          {error === 'rate_limit' ? (
            <AIRateLimitBanner />
          ) : (
            <Message tone="error">{AI_ERROR_MESSAGES[error]}</Message>
          )}
        </View>
      )}

      {/* Success */}
      {!loading && !error && quiz && (
        <>
          <Text style={styles.quizTitle}>{quiz.title}</Text>
          <Text style={styles.questionCount}>
            {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
          </Text>
          {quiz.questions.map((q, i) => (
            <QuizQuestionRow key={i} index={i} {...q} />
          ))}
          {onSave && (
            <Button
              label={saving ? 'Saving Quiz…' : 'Save to My Quizzes'}
              onPress={onSave}
              loading={saving}
              disabled={saving}
              variant="primary"
            />
          )}
        </>
      )}
    </View>
  );
}

// ─── Option styles (shared subcomponent) ─────────────────────────────────────
const qStyles = StyleSheet.create({
  block: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  numBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  numText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  questionText: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    flex: 1,
    lineHeight: 22,
  },
  optionsList: { gap: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 44,
  },
  optionCorrect: {
    backgroundColor: Colors.successMuted,
    borderColor: Colors.success + '60',
  },
  optLetter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optLetterCorrect: { backgroundColor: Colors.success + '30' },
  optLetterText: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  optLetterTextCorrect: { color: Colors.success },
  optText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    flex: 1,
    lineHeight: 20,
  },
  optTextCorrect: { color: Colors.textPrimary, fontWeight: Typography.weight.semibold },
  checkIcon: { color: Colors.success, fontSize: 16, flexShrink: 0 },
  explToggle: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    paddingVertical: 2,
  },
  explBox: {
    backgroundColor: Colors.infoMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.info + '30',
    padding: Spacing.md,
  },
  explText: {
    color: Colors.info,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },
});

// ─── Card wrapper styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  badgeIcon: { color: Colors.primaryLight, fontSize: 11 },
  badgeText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: Typography.tracking.wider,
    textTransform: 'uppercase',
  },
  dismiss: { color: Colors.textMuted, fontSize: Typography.size.sm },
  notSavedBanner: {
    backgroundColor: Colors.surfacePressed,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  notSavedText: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
  skeletonWrap: { gap: Spacing.sm },
  errorWrap: { gap: Spacing.sm },
  quizTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tight,
  },
  questionCount: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
  },
});
