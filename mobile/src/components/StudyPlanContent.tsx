import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

type StudyDay = {
  day: string;
  title: string;
  details: string[];
};

function clean(value: string) {
  return value
    .replace(/\*\*/g, '')
    .replace(/^[-•]\s*/, '')
    .trim();
}

function parseStudyPlan(plan: string): StudyDay[] {
  const matches = [...plan.matchAll(/(?:^|\n)\s*#{0,4}\s*\**Day\s+(\d+)\s*:?\s*([^\n*]*)\**\s*/gi)];
  if (!matches.length) return [];

  return matches.map((match, index) => {
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = matches[index + 1]?.index ?? plan.length;
    const details = plan
      .slice(contentStart, contentEnd)
      .split('\n')
      .map(clean)
      .filter(Boolean)
      .slice(0, 3);

    return {
      day: `Day ${match[1]}`,
      title: clean(match[2]) || 'Study session',
      details,
    };
  });
}

export function StudyPlanContent({ plan, compact = false }: { plan: string; compact?: boolean }) {
  const days = parseStudyPlan(plan);

  if (!days.length) {
    return <Text style={styles.fallback}>{plan}</Text>;
  }

  const visibleDays = compact ? days.slice(0, 2) : days;
  return (
    <View style={styles.list}>
      {visibleDays.map((item) => (
        <View key={item.day} style={styles.dayCard}>
          <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>{item.day}</Text></View>
          <View style={styles.dayContent}>
            <Text style={styles.title}>{item.title}</Text>
            {item.details.map((detail, index) => (
              <Text key={`${item.day}-${index}`} style={styles.detail}>• {detail}</Text>
            ))}
          </View>
        </View>
      ))}
      {compact && days.length > visibleDays.length && (
        <Text style={styles.more}>+ {days.length - visibleDays.length} more days</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  dayCard: {
    flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg,
  },
  dayBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  dayBadgeText: { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  dayContent: { flex: 1, gap: 3 },
  title: { color: Colors.textPrimary, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  detail: { color: Colors.textSecondary, fontSize: Typography.size.xs, lineHeight: 18 },
  more: { color: Colors.textMuted, fontSize: Typography.size.xs, textAlign: 'center' },
  fallback: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20 },
});
