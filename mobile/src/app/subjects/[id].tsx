import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Screen,
  BottomNav,
  SegmentedControl,
  Badge,
  Card,
  Button,
  IconButton,
  EmptyState,
  LoadingState,
  SkeletonCard,
  Message,
  Field,
} from '@/components/ui';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { getSubjects, Subject } from '@/services/api/subjectApi';
import { getNotes, Note, deleteNote } from '@/services/api/noteApi';
import {
  getStudyMaterials,
  StudyMaterial,
  deleteStudyMaterial,
  downloadStudyMaterial,
} from '@/services/api/studyMaterialApi';
import { getQuizzes, Quiz, deleteQuiz } from '@/services/api/quizApi';
import { useAuth } from '@/context/AuthContext';
import {
  askMaterial,
  parseAIError,
  isAuthError,
  type AIErrorKind,
} from '@/services/api/aiApi';
import { AIAnswerCard } from '@/components/AIAnswerCard';
import axios from 'axios';

// ─── Per-material AI state ────────────────────────────────────────────────────
interface MaterialAIState {
  expanded: boolean;
  question: string;
  asking: boolean;
  answer: string | null;
  error: AIErrorKind | null;
}

const INITIAL_AI: MaterialAIState = {
  expanded: false,
  question: '',
  asking: false,
  answer: null,
  error: null,
};

// ─── File badge color ─────────────────────────────────────────────────────────
function getFileBadgeColor(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf')  return Colors.error;
  if (ext === 'docx') return Colors.info;
  if (ext === 'pptx') return Colors.warning;
  return Colors.textMuted;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const subjectId = Number(id);
  const router = useRouter();
  const { signOut } = useAuth();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Notes');

  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  // AI Q&A state per material
  const [aiStates, setAiStates] = useState<Record<number, MaterialAIState>>({});

  useEffect(() => { loadSubject(); }, [subjectId]);

  useEffect(() => {
    if (tab === 'Notes')     loadNotes();
    if (tab === 'Materials') loadMaterials();
    if (tab === 'Quizzes')   loadQuizzes();
  }, [tab]);

  const loadSubject = async () => {
    try {
      setLoading(true);
      const [subs, notesData, matsData, allQuizzes] = await Promise.all([
        getSubjects(),
        getNotes(subjectId),
        getStudyMaterials(subjectId),
        getQuizzes(),
      ]);
      const found = subs.find(s => s.id === subjectId);
      if (found) setSubject(found);
      setNotes(notesData);
      setMaterials(matsData);
      setQuizzes(allQuizzes.filter(q => q.subject_id === subjectId));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      setLoadingNotes(true);
      setNotes(await getNotes(subjectId));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
    } finally { setLoadingNotes(false); }
  };

  const loadMaterials = async () => {
    try {
      setLoadingMaterials(true);
      setMaterials(await getStudyMaterials(subjectId));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
    } finally { setLoadingMaterials(false); }
  };

  const loadQuizzes = async () => {
    try {
      setLoadingQuizzes(true);
      // Fetch all quizzes and filter by this subject
      const all = await getQuizzes();
      setQuizzes(all.filter(q => q.subject_id === subjectId));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
    } finally { setLoadingQuizzes(false); }
  };

  // ── Note actions ──────────────────────────────────────────────────────────
  const removeNote = async (noteId: number) => {
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else Alert.alert('Error', 'Failed to delete note');
    }
  };

  const handleDeleteNote = (noteId: number) => {
    if (Platform.OS === 'web') { void removeNote(noteId); return; }
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void removeNote(noteId) },
    ]);
  };

  // ── Quiz actions ──────────────────────────────────────────────────────────
  const removeQuiz = async (quizId: number) => {
    try {
      await deleteQuiz(quizId);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else Alert.alert('Error', 'Failed to delete quiz');
    }
  };

  const handleDeleteQuiz = (quizId: number) => {
    if (Platform.OS === 'web') { void removeQuiz(quizId); return; }
    Alert.alert('Delete Quiz', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void removeQuiz(quizId) },
    ]);
  };

  // ── Material open ─────────────────────────────────────────────────────────
  const openMaterial = async (mat: StudyMaterial) => {
    if (Platform.OS !== 'web') {
      Alert.alert('Open Material', 'Opening is available in the web app.');
      return;
    }
    try {
      const blob = await downloadStudyMaterial(mat.id);
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) signOut();
      else Alert.alert('Error', 'Could not open file');
    }
  };

  // ── AI Q&A helpers ────────────────────────────────────────────────────────
  const getAI  = (id: number) => aiStates[id] ?? INITIAL_AI;
  const setAI  = (id: number, patch: Partial<MaterialAIState>) =>
    setAiStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? INITIAL_AI), ...patch } }));

  const toggleAI = (id: number) => {
    const cur = getAI(id);
    setAI(id, cur.expanded ? INITIAL_AI : { expanded: true });
  };

  const handleAskAI = async (matId: number) => {
    const state = getAI(matId);
    if (state.asking) return;
    const question = state.question.trim();
    if (!question) { setAI(matId, { error: 'validation' }); return; }
    setAI(matId, { asking: true, answer: null, error: null });
    try {
      const result = await askMaterial(matId, question);
      setAI(matId, { asking: false, answer: result.answer });
    } catch (err) {
      if (isAuthError(err)) { signOut(); return; }
      setAI(matId, { asking: false, error: parseAIError(err) });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return <Screen><LoadingState label="Loading subject..." /></Screen>;

  if (!subject) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <EmptyState title="Not Found" text="Subject not found." action="Go Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const accentColor = subject.color || Colors.primary;

  // ── Tab: Notes ────────────────────────────────────────────────────────────
  const renderNotes = () => (
    <View style={styles.tabContent}>
      <Button
        label="+ Add Note"
        onPress={() => router.push(`/notes/new?subjectId=${subject.id}` as any)}
        size="sm"
      />
      <View style={styles.list}>
        {loadingNotes ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : notes.length === 0 ? (
          <EmptyState
            title="No notes yet"
            text="Create a note for this subject."
            action="Add Note"
            onAction={() => router.push(`/notes/new?subjectId=${subject.id}` as any)}
          />
        ) : (
          notes.map(note => (
            <Pressable
              key={note.id}
              onPress={() => router.push(`/notes/${note.id}` as any)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.noteCard, pressed && styles.pressed]}
            >
              <View style={[styles.noteAccent, { backgroundColor: accentColor }]} />
              <View style={styles.noteBody}>
                <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                <Text style={styles.notePreview} numberOfLines={2}>{note.content}</Text>
                <Text style={styles.noteDate}>{new Date(note.updated_at).toLocaleDateString()}</Text>
              </View>
              <Pressable
                onPress={() => handleDeleteNote(note.id)}
                hitSlop={8}
                style={styles.deleteBtn}
                accessibilityRole="button"
                accessibilityLabel="Delete note"
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </Pressable>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );

  // ── Tab: Materials ────────────────────────────────────────────────────────
  const renderMaterials = () => (
    <View style={styles.tabContent}>
      <Button
        label="+ Upload Material"
        onPress={() => router.push('/materials')}
        size="sm"
      />
      <View style={styles.list}>
        {loadingMaterials ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : materials.length === 0 ? (
          <EmptyState
            title="No materials yet"
            text="Upload PDFs, Word docs, or slides."
            action="Upload"
            onAction={() => router.push('/materials')}
          />
        ) : (
          materials.map(mat => {
            const ai  = getAI(mat.id);
            const ext = mat.original_filename.split('.').pop()?.toUpperCase() ?? 'FILE';
            const badgeColor = getFileBadgeColor(mat.original_filename);

            return (
              <View key={mat.id} style={styles.matCard}>
                {/* File info row */}
                <View style={styles.matHeader}>
                  <View style={[styles.matIcon, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '40' }]}>
                    <Text style={[styles.matIconText, { color: badgeColor }]}>{ext}</Text>
                  </View>
                  <View style={styles.matMeta}>
                    <Text style={styles.matName} numberOfLines={1}>{mat.original_filename}</Text>
                    <Text style={styles.matSize}>
                      {(mat.file_size / (1024 * 1024)).toFixed(2)} MB · {new Date(mat.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void openMaterial(mat)}
                    hitSlop={8}
                    style={styles.openBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Open file"
                  >
                    <Text style={styles.openBtnText}>↗</Text>
                  </Pressable>
                </View>

                {/* Action row */}
                <View style={styles.matActions}>
                  <Pressable
                    onPress={() => toggleAI(mat.id)}
                    style={({ pressed }) => [
                      styles.askAiBtn,
                      ai.expanded && styles.askAiBtnActive,
                      pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={ai.expanded ? 'Close AI Q&A' : 'Ask AI about this file'}
                  >
                    <Text style={[styles.askAiBtnText, ai.expanded && styles.askAiBtnTextActive]}>
                      {ai.expanded ? '✕ Close AI' : '✦ Ask AI'}
                    </Text>
                  </Pressable>
                </View>

                {/* AI Q&A panel */}
                {ai.expanded && (
                  <View style={styles.aiPanel}>
                    <Field
                      label="Your question"
                      value={ai.question}
                      onChangeText={t => setAI(mat.id, { question: t, error: null, answer: null })}
                      placeholder="e.g. What is the main topic?"
                      multiline
                      style={styles.questionInput}
                      editable={!ai.asking}
                    />
                    {ai.error === 'validation' && !ai.asking && !ai.answer && (
                      <Message tone="error">Please enter a question before asking AI.</Message>
                    )}
                    <Button
                      label={ai.asking ? 'Asking AI…' : '✦  Ask AI'}
                      onPress={() => void handleAskAI(mat.id)}
                      variant="secondary"
                      size="sm"
                      loading={ai.asking}
                      disabled={ai.asking}
                    />
                    <AIAnswerCard
                      question={ai.question}
                      answer={ai.answer}
                      loading={ai.asking}
                      error={ai.error !== 'validation' ? ai.error : null}
                      onDismiss={() => setAI(mat.id, { answer: null, error: null, question: '' })}
                      onRetry={() => void handleAskAI(mat.id)}
                    />
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </View>
  );

  // ── Tab: Quizzes ──────────────────────────────────────────────────────────
  const renderQuizzes = () => (
    <View style={styles.tabContent}>
      <Button
        label="✦ Generate AI Quiz"
        onPress={() => router.push(`/quizzes?subjectId=${subject.id}` as any)}
        size="sm"
      />
      <View style={styles.list}>
        {loadingQuizzes ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : quizzes.length === 0 ? (
          <EmptyState
            title="No quizzes yet"
            text="Generate an AI quiz from your materials or subject topics."
            action="Generate Quiz"
            onAction={() => router.push(`/quizzes?subjectId=${subject.id}` as any)}
          />
        ) : (
          quizzes.map(quiz => (
            <Pressable
              key={quiz.id}
              onPress={() => router.push(`/quiz/${quiz.id}` as any)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.quizCard, pressed && styles.pressed]}
            >
              {/* Left accent */}
              <View style={[styles.quizAccent, { backgroundColor: accentColor }]} />
              <View style={styles.quizBody}>
                <Text style={styles.quizTitle} numberOfLines={1}>{quiz.title}</Text>
                {quiz.description ? (
                  <Text style={styles.quizDesc} numberOfLines={1}>{quiz.description}</Text>
                ) : null}
                <View style={styles.quizFooter}>
                  <View style={[styles.quizBadge, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
                    <Text style={[styles.quizBadgeText, { color: accentColor }]}>
                      {quiz.questions?.length ?? '—'} questions
                    </Text>
                  </View>
                  <Text style={styles.quizDate}>{new Date(quiz.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
              <View style={styles.quizRight}>
                <Text style={[styles.quizArrow, { color: accentColor }]}>›</Text>
                <Pressable
                  onPress={() => handleDeleteQuiz(quiz.id)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Delete quiz"
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Banner ── */}
        <View style={[styles.banner, { backgroundColor: accentColor + '25' }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>Subjects</Text>
          </Pressable>

          <View style={styles.bannerContent}>
            <View style={[styles.bannerDot, { backgroundColor: accentColor }]} />
            <Text style={styles.subjectTitle} numberOfLines={2}>{subject.name}</Text>
          </View>

          {subject.description ? (
            <Text style={styles.subjectDesc} numberOfLines={2}>{subject.description}</Text>
          ) : null}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: accentColor }]}>{notes.length || '—'}</Text>
              <Text style={styles.statLabel}>Notes</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: accentColor }]}>{materials.length || '—'}</Text>
              <Text style={styles.statLabel}>Materials</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: accentColor }]}>{quizzes.length || '—'}</Text>
              <Text style={styles.statLabel}>Quizzes</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: subject.is_completed ? Colors.success : accentColor }]}>
                {subject.is_completed ? '✓' : 'Active'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabsWrap}>
          <SegmentedControl
            options={['Notes', 'Materials', 'Quizzes']}
            selected={tab}
            onSelect={setTab}
          />
          {tab === 'Notes'     && renderNotes()}
          {tab === 'Materials' && renderMaterials()}
          {tab === 'Quizzes'   && renderQuizzes()}
        </View>

      </ScrollView>
      <BottomNav active="Subjects" onNavigate={route => router.push(route as never)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Banner
  banner: {
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: Spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  backIcon: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  backLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bannerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  subjectTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.black,
    flex: 1,
    letterSpacing: -0.5,
  },
  subjectDesc: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    lineHeight: 20,
    paddingLeft: Spacing.lg,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface + 'CC',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  statValue: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    marginTop: 2,
  },

  // Tabs
  tabsWrap: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  tabContent: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  list: {
    gap: Spacing.md,
  },

  // Note card
  noteCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  noteAccent: {
    width: 4,
  },
  noteBody: {
    flex: 1,
    padding: Spacing.md,
    gap: 4,
  },
  noteTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
  },
  notePreview: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    lineHeight: 19,
  },
  noteDate: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    marginTop: 2,
  },

  // Material card
  matCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  matHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  matIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matIconText: {
    fontSize: 11,
    fontWeight: Typography.weight.black,
    letterSpacing: 0.5,
  },
  matMeta: {
    flex: 1,
  },
  matName: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  matSize: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    marginTop: 2,
  },
  openBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: {
    color: Colors.primaryLight,
    fontSize: 16,
    fontWeight: Typography.weight.bold,
  },
  matActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  askAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  askAiBtnActive: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  askAiBtnText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  askAiBtnTextActive: {
    color: Colors.textMuted,
  },
  aiPanel: {
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  questionInput: {
    minHeight: 76,
    textAlignVertical: 'top',
  },

  // Quiz card
  quizCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  quizAccent: {
    width: 4,
  },
  quizBody: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  quizTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
  },
  quizDesc: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
  },
  quizFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  quizBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  quizBadgeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  quizDate: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
  },
  quizRight: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  quizArrow: {
    fontSize: 24,
    fontWeight: Typography.weight.bold,
  },

  // Shared
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.errorMuted,
    borderWidth: 1,
    borderColor: Colors.error + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: Typography.weight.bold,
  },
});
