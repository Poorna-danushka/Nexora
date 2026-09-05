// ─── AISummaryCard ────────────────────────────────────────────────────────────
// Reusable card that renders the three states of a note-summarization request:
//   loading → skeleton rows
//   error   → AIRateLimitBanner or generic error message
//   success → formatted summary text with AI badge

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Button, Message, SkeletonLine } from '@/components/ui';
import { AIRateLimitBanner } from '@/components/AIRateLimitBanner';
import { AI_ERROR_MESSAGES, type AIErrorKind } from '@/services/api/aiApi';

interface AISummaryCardProps {
  summary: string | null;
  loading: boolean;
  error: AIErrorKind | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function AISummaryCard({
  summary,
  loading,
  error,
  onDismiss,
  onRetry,
}: AISummaryCardProps) {
  if (!loading && !error && !summary) return null;

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>✦</Text>
          <Text style={styles.badgeText}>AI Summary</Text>
        </View>
        {onDismiss && !loading && (
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Dismiss summary"
          >
            <Text style={styles.dismiss}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.skeletonWrap}>
          <SkeletonLine width="95%" height={14} />
          <SkeletonLine width="88%" height={14} />
          <SkeletonLine width="92%" height={14} />
          <SkeletonLine width="70%" height={14} />
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
            <Button
              label="Retry"
              onPress={onRetry}
              variant="ghost"
              size="sm"
            />
          )}
        </View>
      )}

      {/* Success state */}
      {!loading && !error && summary && (
        <Text style={styles.summaryText}>{summary}</Text>
      )}

      {/* Footer disclaimer */}
      {!loading && !error && summary && (
        <Text style={styles.disclaimer}>
          AI-generated · Not saved to your notes
        </Text>
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
  badgeIcon: {
    color: Colors.primaryLight,
    fontSize: 11,
  },
  badgeText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: Typography.tracking.wider,
    textTransform: 'uppercase',
  },
  dismiss: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
  },
  skeletonWrap: {
    gap: Spacing.sm,
  },
  errorWrap: {
    gap: Spacing.sm,
  },
  summaryText: {
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
