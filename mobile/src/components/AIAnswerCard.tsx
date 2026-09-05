// ─── AIAnswerCard ─────────────────────────────────────────────────────────────
// Reusable card that renders the three states of a study-material Q&A request:
//   loading → skeleton rows
//   error   → AIRateLimitBanner or generic error message
//   success → echoed question + AI answer

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Button, Message, SkeletonLine } from '@/components/ui';
import { AIRateLimitBanner } from '@/components/AIRateLimitBanner';
import { AI_ERROR_MESSAGES, type AIErrorKind } from '@/services/api/aiApi';

interface AIAnswerCardProps {
  question: string;
  answer: string | null;
  loading: boolean;
  error: AIErrorKind | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function AIAnswerCard({
  question,
  answer,
  loading,
  error,
  onDismiss,
  onRetry,
}: AIAnswerCardProps) {
  if (!loading && !error && !answer) return null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>✦</Text>
          <Text style={styles.badgeText}>AI Answer</Text>
        </View>
        {onDismiss && !loading && (
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Dismiss answer"
          >
            <Text style={styles.dismiss}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Echoed question */}
      <View style={styles.questionBubble}>
        <Text style={styles.questionLabel}>Your question</Text>
        <Text style={styles.questionText} numberOfLines={4}>{question}</Text>
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.skeletonWrap}>
          <SkeletonLine width="96%" height={14} />
          <SkeletonLine width="80%" height={14} />
          <SkeletonLine width="90%" height={14} />
        </View>
      )}

      {/* Error state */}
      {!loading && error && (
        <View style={styles.errorWrap}>
          {error === 'rate_limit' ? (
            <AIRateLimitBanner />
          ) : (
            <Message tone="error">{AI_ERROR_MESSAGES[error]}</Message>
          )}
          {onRetry && error !== 'rate_limit' && (
            <Button label="Retry" onPress={onRetry} variant="ghost" size="sm" />
          )}
        </View>
      )}

      {/* Success state */}
      {!loading && !error && answer && (
        <>
          <View style={styles.divider} />
          <Text style={styles.answerText}>{answer}</Text>
          <Text style={styles.disclaimer}>AI-generated · Not saved</Text>
        </>
      )}
    </View>
  );
}

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
  questionBubble: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  questionLabel: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: Typography.tracking.wider,
  },
  questionText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },
  skeletonWrap: { gap: Spacing.sm },
  errorWrap: { gap: Spacing.sm },
  divider: { height: 1, backgroundColor: Colors.border },
  answerText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
    lineHeight: 24,
  },
  disclaimer: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontStyle: 'italic',
  },
});
