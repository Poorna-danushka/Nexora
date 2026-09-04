import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getQuizzes, Quiz } from '@/services/api/quizApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Badge, BottomNav, EmptyState, Message, SkeletonCard } from '@/components/ui';

export default function QuizzesScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setQuizzes(await getQuizzes());
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      } else {
        setError('Unable to load quizzes. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Quizzes</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {error && <Message tone="error">{error}</Message>}

          {loading
            ? <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
            : quizzes.length === 0
            ? (
              <EmptyState
                icon="✦"
                title="No quizzes yet"
                text="Quizzes assigned to your subjects will appear here."
              />
            )
            : quizzes.map((quiz) => (
              <Pressable
                key={quiz.id}
                style={({ pressed }) => [styles.quizCard, pressed && styles.quizCardPressed]}
                onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: String(quiz.id) } })}
                accessibilityRole="button"
                accessibilityLabel={`Open ${quiz.title}`}
              >
                {/* Left accent */}
                <View style={styles.quizAccent} />

                <View style={styles.quizBody}>
                  <View style={styles.quizTop}>
                    <Text style={styles.quizTitle} numberOfLines={2}>{quiz.title}</Text>
                    <View style={styles.quizChevron}>
                      <Text style={styles.chevronText}>›</Text>
                    </View>
                  </View>

                  {quiz.description && (
                    <Text style={styles.quizDesc} numberOfLines={1}>{quiz.description}</Text>
                  )}

                  <View style={styles.quizMeta}>
                    {quiz.questions && quiz.questions.length > 0 && (
                      <Badge label={`${quiz.questions.length} questions`} color={Colors.primary} />
                    )}
                    <Badge label={`Subject #${quiz.subject_id}`} color={Colors.primaryLight} />
                  </View>
                </View>
              </Pressable>
            ))
          }
        </ScrollView>
      </SafeAreaView>

      <BottomNav active="Subjects" onNavigate={(r) => router.push(r as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  backIcon: { color: Colors.primaryLight, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, lineHeight: 26 },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },

  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },

  quizCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  quizCardPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  quizAccent: { width: 4, backgroundColor: Colors.primary },
  quizBody: { flex: 1, padding: Spacing.lg, gap: Spacing.sm },
  quizTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  quizTitle: { color: Colors.textPrimary, fontSize: Typography.size.md, fontWeight: Typography.weight.black, flex: 1, letterSpacing: Typography.tracking.tight },
  quizChevron: { width: 28, height: 28, borderRadius: Radius.sm, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chevronText: { color: Colors.textMuted, fontSize: Typography.size.lg },
  quizDesc: { color: Colors.textMuted, fontSize: Typography.size.sm, lineHeight: 20 },
  quizMeta: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
});
