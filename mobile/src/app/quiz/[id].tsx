import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Attempt, getAttemptHistory, getQuiz, Quiz, submitAttempt } from '@/services/api/quizApi';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Badge, Button, EmptyState, LoadingState, Message, ProgressBar } from '@/components/ui';

type Screen = 'quiz' | 'results' | 'history';

function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const color = pct >= 80 ? Colors.success : pct >= 60 ? Colors.warning : Colors.error;
  return (
    <View style={[styles.scoreRing, { borderColor: color }]}>
      <Text style={[styles.scorePercent, { color }]}>{pct}%</Text>
      <Text style={styles.scoreRatio}>{score}/{total}</Text>
    </View>
  );
}

function getScoreLabel(pct: number) {
  if (pct >= 90) return 'Excellent!';
  if (pct >= 80) return 'Great work!';
  if (pct >= 70) return 'Good job!';
  if (pct >= 60) return 'Keep going!';
  return 'Keep practicing!';
}

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Attempt | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [screen, setScreen] = useState<Screen>('quiz');

  useEffect(() => {
    getQuiz(Number(id))
      .then(setQuiz)
      .catch(() => setError('Unable to load this quiz. Please go back and try again.'))
      .finally(() => setLoading(false));
  }, [id]);

  const questions = quiz?.questions ?? [];
  const currentQuestion = questions[currentQ];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;

  const selectAnswer = (questionId: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const doSubmit = async () => {
    const unanswered = totalQ - answeredCount;
    if (unanswered > 0) {
      Alert.alert(
        'Submit quiz?',
        `${unanswered} question${unanswered > 1 ? 's are' : ' is'} unanswered. You can still submit.`,
        [
          { text: 'Continue Quiz', style: 'cancel' },
          { text: 'Submit Anyway', style: 'destructive', onPress: () => actuallySubmit() },
        ]
      );
    } else {
      actuallySubmit();
    }
  };

  const actuallySubmit = async () => {
    setSubmitting(true);
    try {
      const attempt = await submitAttempt(Number(id), answers);
      setResult(attempt);
      setScreen('results');
      // Load history in background
      getAttemptHistory(Number(id)).then(setHistory).catch(() => {});
    } catch {
      setError('Unable to submit your quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setAnswers({});
    setCurrentQ(0);
    setResult(null);
    setScreen('quiz');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState label="Loading quiz…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorWrap}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
          <Message tone="error">{error}</Message>
        </View>
      </SafeAreaView>
    );
  }

  // ── Results screen ────────────────────────────────────────────────────────
  if (screen === 'results' && result) {
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>Back to Quizzes</Text>
          </Pressable>

          {/* Score */}
          <View style={styles.resultsCenter}>
            <Text style={styles.resultsLabel}>{getScoreLabel(pct)}</Text>
            <ScoreRing score={result.score} total={result.total} />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: Colors.success }]}>{result.score}</Text>
              <Text style={styles.statLbl}>Correct</Text>
            </View>
            <View style={[styles.statBox, styles.statBorderLR]}>
              <Text style={[styles.statNum, { color: Colors.error }]}>{result.total - result.score}</Text>
              <Text style={styles.statLbl}>Incorrect</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: Colors.primaryLight }]}>{pct}%</Text>
              <Text style={styles.statLbl}>Accuracy</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.resultProgress}>
            <ProgressBar progress={pct} color={pct >= 70 ? Colors.success : Colors.error} height={8} />
          </View>

          {/* History */}
          {history.length > 1 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Past Attempts</Text>
              {history.slice(0, 5).map((attempt, i) => {
                const p = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
                const isLatest = i === 0;
                return (
                  <View key={attempt.id} style={[styles.historyRow, isLatest && styles.historyRowLatest]}>
                    <View>
                      <Text style={styles.historyDate}>
                        {new Date(attempt.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        {isLatest && <Text style={styles.historyNew}>  · Latest</Text>}
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={[styles.historyScore, { color: p >= 70 ? Colors.success : Colors.warning }]}>{p}%</Text>
                      <Text style={styles.historyRatio}>{attempt.score}/{attempt.total}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Actions */}
          <View style={styles.resultActions}>
            <Button label="Try Again" onPress={retry} variant="primary" size="lg" />
            <Button label="Back to Quizzes" onPress={() => router.back()} variant="secondary" />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Quiz-taking screen ────────────────────────────────────────────────────
  if (!quiz || questions.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.scroll}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
          <EmptyState icon="✦" title="No questions" text="This quiz doesn't have any questions yet." />
        </View>
      </SafeAreaView>
    );
  }

  const isAnswered = answers[currentQuestion.id] !== undefined;
  const selectedOption = answers[currentQuestion.id];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Quiz header */}
      <View style={styles.quizHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.quizHeaderCenter}>
          <Text style={styles.quizHeaderTitle} numberOfLines={1}>{quiz.title}</Text>
          <Text style={styles.quizHeaderProgress}>Question {currentQ + 1} of {totalQ}</Text>
        </View>
        <View style={styles.quizHeaderRight}>
          <Text style={styles.answeredCount}>{answeredCount}/{totalQ}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.quizProgressWrap}>
        <ProgressBar progress={((currentQ + 1) / totalQ) * 100} color={Colors.primary} height={4} />
      </View>

      <ScrollView contentContainerStyle={styles.quizScroll} showsVerticalScrollIndicator={false}>
        {error && <Message tone="error">{error}</Message>}

        {/* Question */}
        <View style={styles.questionBlock}>
          <Text style={styles.questionNum}>Q{currentQ + 1}</Text>
          <Text style={styles.questionText}>{currentQuestion.prompt}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsBlock}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === index;
            return (
              <Pressable
                key={`${currentQuestion.id}-${index}`}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && !isSelected && styles.optionPressed,
                ]}
                onPress={() => selectAnswer(currentQuestion.id, index)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Option ${index + 1}: ${option}`}
              >
                <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                  {isSelected && <View style={styles.optionRadioDot} />}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Navigation footer */}
      <View style={styles.navFooter}>
        {/* Previous */}
        <Pressable
          style={[styles.navBtn, currentQ === 0 && styles.navBtnDisabled]}
          onPress={() => setCurrentQ((q) => Math.max(0, q - 1))}
          disabled={currentQ === 0}
          accessibilityRole="button"
          accessibilityLabel="Previous question"
        >
          <Text style={[styles.navBtnText, currentQ === 0 && styles.navBtnTextDisabled]}>‹ Prev</Text>
        </Pressable>

        {/* Dot indicators */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dotRow}>
          {questions.map((q, i) => (
            <Pressable
              key={q.id}
              onPress={() => setCurrentQ(i)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Go to question ${i + 1}`}
            >
              <View
                style={[
                  styles.dot,
                  i === currentQ && styles.dotCurrent,
                  answers[q.id] !== undefined && i !== currentQ && styles.dotAnswered,
                ]}
              />
            </Pressable>
          ))}
        </ScrollView>

        {/* Next / Submit */}
        {currentQ < totalQ - 1 ? (
          <Pressable
            style={styles.navBtn}
            onPress={() => setCurrentQ((q) => Math.min(totalQ - 1, q + 1))}
            accessibilityRole="button"
            accessibilityLabel="Next question"
          >
            <Text style={styles.navBtnText}>Next ›</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.navBtn, styles.submitBtn]}
            onPress={doSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Submit quiz"
          >
            <Text style={styles.submitBtnText}>{submitting ? '…' : 'Submit'}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing['3xl'], gap: Spacing.xl },
  errorWrap: { padding: Spacing.xl, gap: Spacing.lg },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backIcon: { color: Colors.primaryLight, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, lineHeight: 26 },
  backLabel: { color: Colors.primaryLight, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },

  // Results
  resultsCenter: { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing['2xl'] },
  resultsLabel: { color: Colors.textPrimary, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.black },
  scoreRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 5, alignItems: 'center', justifyContent: 'center', gap: 4 },
  scorePercent: { fontSize: Typography.size['4xl'], fontWeight: Typography.weight.black },
  scoreRatio: { color: Colors.textMuted, fontSize: Typography.size.base },

  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg, gap: 4 },
  statBorderLR: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statNum: { fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black },
  statLbl: { color: Colors.textMuted, fontSize: Typography.size.xs },

  resultProgress: { paddingHorizontal: Spacing.lg },

  historySection: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  historyTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderColor: Colors.border },
  historyRowLatest: { borderBottomWidth: 0 },
  historyDate: { color: Colors.textSecondary, fontSize: Typography.size.sm },
  historyNew: { color: Colors.primaryLight, fontSize: Typography.size.xs },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  historyScore: { fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  historyRatio: { color: Colors.textMuted, fontSize: Typography.size.sm },

  resultActions: { gap: Spacing.md },

  // Quiz taking
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  quizHeaderCenter: { flex: 1, gap: 2 },
  quizHeaderTitle: { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  quizHeaderProgress: { color: Colors.textMuted, fontSize: Typography.size.xs },
  quizHeaderRight: {},
  answeredCount: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  quizProgressWrap: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },

  quizScroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.xl },

  questionBlock: { gap: Spacing.md },
  questionNum: { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.black, letterSpacing: 1.5, textTransform: 'uppercase' },
  questionText: { color: Colors.textPrimary, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, lineHeight: 30 },

  optionsBlock: { gap: Spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    minHeight: 60,
  },
  optionSelected: { backgroundColor: Colors.primarySubtle, borderColor: Colors.primaryLight },
  optionPressed: { backgroundColor: Colors.surfaceElevated },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionRadioSelected: { borderColor: Colors.primaryLight },
  optionRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primaryLight },
  optionText: { color: Colors.textSecondary, fontSize: Typography.size.base, flex: 1, lineHeight: 22 },
  optionTextSelected: { color: Colors.textPrimary, fontWeight: Typography.weight.semibold },

  // Nav footer
  navFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  navBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surfaceElevated },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  navBtnTextDisabled: { color: Colors.textMuted },
  dotRow: { gap: Spacing.xs, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotCurrent: { backgroundColor: Colors.primaryLight, width: 20, borderRadius: 4 },
  dotAnswered: { backgroundColor: Colors.primary },
  submitBtn: { backgroundColor: Colors.primary },
  submitBtnText: { color: Colors.white, fontSize: Typography.size.sm, fontWeight: Typography.weight.black },
});
