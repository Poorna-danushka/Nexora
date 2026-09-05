// ─── AIPlanCard ───────────────────────────────────────────────────────────────
// Displays the result of POST /study-plans/generate.
// The plan is shown as plain text in a scrollable surface.
// A prominent disclaimer makes it clear the plan is NOT saved automatically.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Button, Message, SkeletonLine } from '@/components/ui';
import { AIRateLimitBanner } from '@/components/AIRateLimitBanner';
import { AI_ERROR_MESSAGES, type AIErrorKind } from '@/services/api/aiApi';
import { StudyPlanContent } from '@/components/StudyPlanContent';

interface AIPlanCardProps {
  plan: string | null;
  loading: boolean;
  error: AIErrorKind | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function AIPlanCard({
  plan,
  loading,
  error,
  onDismiss,
  onRetry,
}: AIPlanCardProps) {
  if (!loading && !error && !plan) return null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>✦</Text>
          <Text style={styles.badgeText}>{loading ? 'Building your plan' : 'Your AI study plan'}</Text>
        </View>
        {onDismiss && !loading && (
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Dismiss plan"
          >
            <Text style={styles.dismiss}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Disclaimer banner */}
      <View style={styles.disclaimerBanner}>
        <Text style={styles.disclaimerIcon}>◈</Text>
        <Text style={styles.disclaimerText}>
          {loading ? 'Creating a plan around your goals and available time.' : 'Generated for you and saved to your study plans.'}
        </Text>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.skeletonWrap}>
          <SkeletonLine width="40%" height={15} />
          <SkeletonLine width="96%" height={13} />
          <SkeletonLine width="88%" height={13} />
          <SkeletonLine width="30%" height={15} style={{ marginTop: Spacing.sm }} />
          <SkeletonLine width="92%" height={13} />
          <SkeletonLine width="80%" height={13} />
          <SkeletonLine width="50%" height={13} />
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
          {onRetry && error !== 'rate_limit' && (
            <Button label="Try again" onPress={onRetry} variant="ghost" size="sm" />
          )}
        </View>
      )}

      {/* Success */}
      {!loading && !error && plan && (
        <ScrollView
          style={styles.planScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <StudyPlanContent plan={plan} />
        </ScrollView>
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
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warningMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  disclaimerIcon: { color: Colors.warning, fontSize: 13 },
  disclaimerText: {
    color: Colors.warning,
    fontSize: Typography.size.xs,
    flex: 1,
    lineHeight: 18,
  },
  skeletonWrap: { gap: Spacing.sm },
  errorWrap: { gap: Spacing.sm },
  planScroll: { maxHeight: 400 },
});
