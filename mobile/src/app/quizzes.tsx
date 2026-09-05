import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteQuiz, getQuizzes, Quiz, saveGeneratedQuiz, updateQuiz } from '@/services/api/quizApi';
import { getSubjects, Subject } from '@/services/api/subjectApi';
import { getStudyMaterials, StudyMaterial } from '@/services/api/studyMaterialApi';
import { generateQuiz, generatePracticeQuestion, parseAIError, isAuthError, type AIErrorKind } from '@/services/api/aiApi';
import type { GeneratedQuizResponse } from '@/types/ai';
import type { PracticeQuestionResponse } from '@/types/ai';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  Badge,
  BottomNav,
  Button,
  Chip,
  EmptyState,
  Field,
  Message,
  SegmentedControl,
  SkeletonCard,
} from '@/components/ui';
import { AIQuizPreview } from '@/components/AIQuizPreview';

export default function QuizzesScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── AI Quiz Generation state ───────────────────────────────────────────────
  const [showAiForm, setShowAiForm] = useState(false);
  const [aiMode, setAiMode] = useState('From Subject'); // 'From Subject' | 'From Material'
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>();
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | undefined>();
  const [questionCount, setQuestionCount] = useState('5');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuizResponse | null>(null);
  const [aiError, setAiError] = useState<AIErrorKind | null>(null);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [practiceQuestion, setPracticeQuestion] = useState<PracticeQuestionResponse | null>(null);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [savingGenerated, setSavingGenerated] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      const [quizList, subList, matList] = await Promise.all([
        getQuizzes(),
        getSubjects(),
        getStudyMaterials(),
      ]);
      setQuizzes(quizList);
      setSubjects(subList);
      setMaterials(matList);
      if (subList.length > 0) setSelectedSubjectId(subList[0].id);
      if (matList.length > 0) setSelectedMaterialId(matList[0].id);
      setSourcesLoaded(true);
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

  const handleGenerateQuiz = async () => {
    if (generating) return; // duplicate request guard

    const count = parseInt(questionCount, 10);
    if (!Number.isFinite(count) || count < 1 || count > 20) {
      setError('Question count must be between 1 and 20.');
      return;
    }

    if (aiMode === 'From Subject' && !selectedSubjectId) {
      setError('Please select a subject.');
      return;
    }
    if (aiMode === 'From Material' && !selectedMaterialId) {
      setError('Please select a study material.');
      return;
    }

    setGenerating(true);
    setGeneratedQuiz(null);
    setAiError(null);
    setError(null);

    try {
      const result = await generateQuiz({
        subject_id: aiMode === 'From Subject' ? selectedSubjectId : undefined,
        material_id: aiMode === 'From Material' ? selectedMaterialId : undefined,
        question_count: count,
        topic: topic.trim() || undefined,
      });
      setGeneratedQuiz(result);
    } catch (err) {
      if (isAuthError(err)) {
        signOut();
        return;
      }
      setAiError(parseAIError(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateQuestion = async () => {
    if (generatingQuestion) return;
    if (aiMode === 'From Subject' && !selectedSubjectId) {
      setError('Please select a subject.');
      return;
    }
    if (aiMode === 'From Material' && !selectedMaterialId) {
      setError('Please select a study material.');
      return;
    }
    setGeneratingQuestion(true);
    setPracticeQuestion(null);
    setAiError(null);
    setError(null);
    try {
      setPracticeQuestion(await generatePracticeQuestion({
        subject_id: aiMode === 'From Subject' ? selectedSubjectId : undefined,
        material_id: aiMode === 'From Material' ? selectedMaterialId : undefined,
        topic: topic.trim() || undefined,
      }));
    } catch (err) {
      if (isAuthError(err)) {
        signOut();
        return;
      }
      setAiError(parseAIError(err));
    } finally {
      setGeneratingQuestion(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!generatedQuiz || savingGenerated) return;
    const subjectId = aiMode === 'From Subject'
      ? selectedSubjectId
      : materials.find((material) => material.id === selectedMaterialId)?.subject_id;
    if (!subjectId) {
      setError('Select a subject or material linked to a subject before saving.');
      return;
    }
    setSavingGenerated(true);
    setError(null);
    try {
      const saved = await saveGeneratedQuiz(subjectId, generatedQuiz);
      setQuizzes((items) => [saved, ...items]);
      setGeneratedQuiz(null);
      setShowAiForm(false);
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError(parseAIError(err));
    } finally {
      setSavingGenerated(false);
    }
  };

  const removeQuiz = async (quizId: number) => {
    try {
      await deleteQuiz(quizId);
      setQuizzes((items) => items.filter((item) => item.id !== quizId));
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError('Unable to delete this quiz. Please try again.');
    }
  };

  const confirmDeleteQuiz = (quiz: Quiz) => {
    if (Platform.OS === 'web') {
      void removeQuiz(quiz.id);
      return;
    }
    Alert.alert('Delete quiz?', `Delete "${quiz.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void removeQuiz(quiz.id); } },
    ]);
  };

  const startEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setEditTitle(quiz.title);
    setEditDescription(quiz.description || '');
    setError(null);
  };

  const saveQuizEdit = async () => {
    if (!editingQuiz || savingEdit) return;
    if (!editTitle.trim()) {
      setError('Quiz title is required.');
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      const updated = await updateQuiz(editingQuiz.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setQuizzes((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      setEditingQuiz(null);
    } catch (err) {
      if (isAuthError(err)) signOut();
      else setError('Unable to update this quiz. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Quizzes</Text>
          </View>
          <Button
            label={showAiForm ? 'Hide AI' : '✦  Generate with AI'}
            onPress={() => setShowAiForm((v) => !v)}
            variant="secondary"
            size="sm"
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {error && <Message tone="error">{error}</Message>}

          {editingQuiz && (
            <View style={styles.editCard}>
              <Text style={styles.editTitle}>Edit Quiz</Text>
              <Field label="Title" value={editTitle} onChangeText={setEditTitle} placeholder="Quiz title" />
              <Field label="Description" value={editDescription} onChangeText={setEditDescription} placeholder="Optional description" multiline />
              <View style={styles.editActions}>
                <Button label="Cancel" variant="secondary" onPress={() => setEditingQuiz(null)} disabled={savingEdit} />
                <Button label="Save Changes" onPress={saveQuizEdit} loading={savingEdit} disabled={savingEdit} />
              </View>
            </View>
          )}

          {/* ─── AI Quiz Generation Form ──────────────────────────────────── */}
          {showAiForm && (
            <View style={styles.aiFormCard}>
              <View style={styles.aiFormHeader}>
                <Text style={styles.aiFormTitle}>✦ AI Quiz Generator</Text>
                <Text style={styles.aiFormSubtitle}>
                  Generate a quiz preview from a subject or uploaded study material.
                </Text>
              </View>

              <SegmentedControl
                options={['From Subject', 'From Material']}
                selected={aiMode}
                onSelect={setAiMode}
              />

              {/* Source selection */}
              {aiMode === 'From Subject' ? (
                <View style={styles.sourceSection}>
                  <Text style={styles.fieldLabel}>Select Subject</Text>
                  {subjects.length === 0 ? (
                    <Text style={styles.hintText}>No subjects available. Create a subject first.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                      {subjects.map((s) => (
                        <Chip
                          key={s.id}
                          label={s.name}
                          active={selectedSubjectId === s.id}
                          onPress={() => setSelectedSubjectId(s.id)}
                          color={s.color}
                        />
                      ))}
                    </ScrollView>
                  )}
                </View>
              ) : (
                <View style={styles.sourceSection}>
                  <Text style={styles.fieldLabel}>Select Study Material</Text>
                  {materials.length === 0 ? (
                    <Text style={styles.hintText}>No study materials available. Upload a material first.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                      {materials.map((m) => (
                        <Chip
                          key={m.id}
                          label={m.original_filename}
                          active={selectedMaterialId === m.id}
                          onPress={() => setSelectedMaterialId(m.id)}
                        />
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Parameter inputs */}
              <View style={styles.paramsRow}>
                <View style={styles.paramHalf}>
                  <Field
                    label="Questions (1–20)"
                    value={questionCount}
                    onChangeText={setQuestionCount}
                    keyboardType="numeric"
                    placeholder="5"
                    returnKeyType="done"
                  />
                </View>
                <View style={styles.paramHalf}>
                  <Field
                    label="Topic hint (optional)"
                    value={topic}
                    onChangeText={setTopic}
                    placeholder="e.g. Chapter 3"
                    returnKeyType="done"
                  />
                </View>
              </View>

              <Button
                label={generating ? 'Generating Quiz…' : '✦  Generate Quiz Preview'}
                onPress={handleGenerateQuiz}
                loading={generating}
                disabled={generating}
              />
              <Button
                label={generatingQuestion ? 'Generating Question…' : 'Generate One Practice Question'}
                onPress={handleGenerateQuestion}
                loading={generatingQuestion}
                disabled={generating || generatingQuestion}
                variant="secondary"
              />
              {practiceQuestion && (
                <View style={styles.practiceCard}>
                  <Text style={styles.practiceLabel}>PRACTICE QUESTION</Text>
                  <Text style={styles.practiceQuestion}>{practiceQuestion.question}</Text>
                  {practiceQuestion.options.map((option) => (
                    <Text key={option} style={[
                      styles.practiceOption,
                      option === practiceQuestion.correct_answer && styles.practiceCorrect,
                    ]}>
                      {option === practiceQuestion.correct_answer ? '✓ ' : '• '}{option}
                    </Text>
                  ))}
                  <Text style={styles.practiceExplanation}>{practiceQuestion.explanation}</Text>
                </View>
              )}

              {/* Quiz preview result card */}
              <AIQuizPreview
                quiz={generatedQuiz}
                loading={generating}
                error={aiError}
                onDismiss={() => { setGeneratedQuiz(null); setAiError(null); }}
                onSave={handleSaveGenerated}
                saving={savingGenerated}
              />
            </View>
          )}

          {/* ─── Assigned Quizzes List ───────────────────────────────────── */}
          <Text style={styles.sectionHeading}>Assigned Quizzes</Text>

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
              <View
                key={quiz.id}
                style={styles.quizCard}
              >
                {/* Left accent */}
                <View style={styles.quizAccent} />

                <View style={styles.quizBody}>
                  <View style={styles.quizTop}>
                    <Text style={styles.quizTitle} numberOfLines={2}>{quiz.title}</Text>
                    <View style={styles.quizTopActions}>
                      <Pressable
                        onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: String(quiz.id) } })}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${quiz.title}`}
                        style={styles.quizChevron}
                      >
                        <Text style={styles.chevronText}>›</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => startEditQuiz(quiz)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${quiz.title}`}
                        style={styles.editQuizButton}
                      >
                        <Text style={styles.editQuizText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDeleteQuiz(quiz)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${quiz.title}`}
                        style={styles.deleteQuizButton}
                      >
                        <Text style={styles.deleteQuizText}>Delete</Text>
                      </Pressable>
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
              </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backIcon: { color: Colors.primaryLight, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, lineHeight: 26 },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },

  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },

  // AI Form Card
  aiFormCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  editCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  editTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  editActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  aiFormHeader: { gap: 4 },
  aiFormTitle: {
    color: Colors.primaryLight,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black,
  },
  aiFormSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },
  sourceSection: { gap: Spacing.xs },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
  hintText: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontStyle: 'italic',
  },
  chipsRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  paramsRow: { flexDirection: 'row', gap: Spacing.md },
  paramHalf: { flex: 1 },
  practiceCard: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.primary + '40' },
  practiceLabel: { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, letterSpacing: Typography.tracking.wider },
  practiceQuestion: { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold, lineHeight: 22 },
  practiceOption: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20 },
  practiceCorrect: { color: Colors.success, fontWeight: Typography.weight.bold },
  practiceExplanation: { color: Colors.textMuted, fontSize: Typography.size.sm, lineHeight: 20, marginTop: Spacing.xs },

  sectionHeading: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: Typography.tracking.wider,
    marginTop: Spacing.sm,
  },

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
  quizTopActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  quizTitle: { color: Colors.textPrimary, fontSize: Typography.size.md, fontWeight: Typography.weight.black, flex: 1, letterSpacing: Typography.tracking.tight },
  quizChevron: { width: 28, height: 28, borderRadius: Radius.sm, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chevronText: { color: Colors.textMuted, fontSize: Typography.size.lg },
  deleteQuizButton: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xs },
  deleteQuizText: { color: Colors.error, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
  editQuizButton: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xs },
  editQuizText: { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
  quizDesc: { color: Colors.textMuted, fontSize: Typography.size.sm, lineHeight: 20 },
  quizMeta: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
});
