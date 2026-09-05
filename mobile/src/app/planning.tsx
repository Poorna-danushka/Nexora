import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  completeStudyGoal,
  completeStudySession,
  createStudyGoal,
  createStudySession,
  deleteStudyGoal,
  deleteStudySession,
  getStudyGoals,
  getStudySessions,
  StudyGoal,
  StudySession,
} from '@/services/api/planningApi';
import { getSubjects, Subject } from '@/services/api/subjectApi';
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
  ProgressBar,
  SegmentedControl,
  SkeletonCard,
} from '@/components/ui';
import { deleteSavedStudyPlan, generateStudyPlan, getSavedStudyPlans, parseAIError, isAuthError, type AIErrorKind } from '@/services/api/aiApi';
import { AIPlanCard } from '@/components/AIPlanCard';
import { StudyPlanContent } from '@/components/StudyPlanContent';
import type { StudyPlanResponse } from '@/types/ai';

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function PlanningScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [tab, setTab] = useState('Sessions');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session create form
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDuration, setSessionDuration] = useState('60');
  const [addingSession, setAddingSession] = useState(false);

  // Goal create form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);

  // ─── AI Plan state ──────────────────────────────────────────────────────────
  const [aiSubjectIds, setAiSubjectIds] = useState<number[]>([]);  // empty = all
  const [aiDays, setAiDays] = useState('7');
  const [aiMinutesPerDay, setAiMinutesPerDay] = useState('60');
  const [aiPriorities, setAiPriorities] = useState('');
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [planError, setPlanError] = useState<AIErrorKind | null>(null);
  const [savedPlans, setSavedPlans] = useState<StudyPlanResponse[]>([]);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, g, sub, saved] = await Promise.all([
        getStudySessions(), getStudyGoals(), getSubjects(), getSavedStudyPlans(),
      ]);
      setSessions(s);
      setGoals(g);
      setSubjects(sub);
      setSavedPlans(saved);
      if (!subjectId && sub.length) setSubjectId(sub[0].id);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        signOut();
      } else {
        setError('Unable to load your planner.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const addSession = async () => {
    if (!sessionTitle.trim()) { setError('Enter a session title.'); return; }
    setAddingSession(true);
    setError(null);
    try {
      const item = await createStudySession({
        title: sessionTitle.trim(),
        subject_id: subjectId,
        scheduled_for: new Date().toISOString(),
        duration_minutes: parseInt(sessionDuration) || 60,
        is_completed: false,
      });
      setSessions((x) => [item, ...x]);
      setSessionTitle('');
      setShowSessionForm(false);
    } catch { setError('Unable to create study session.'); }
    finally { setAddingSession(false); }
  };

  const addGoal = async () => {
    if (!goalTitle.trim()) { setError('Enter a goal title.'); return; }
    setAddingGoal(true);
    setError(null);
    try {
      const item = await createStudyGoal({
        title: goalTitle.trim(),
        subject_id: subjectId,
        is_completed: false,
      });
      setGoals((x) => [item, ...x]);
      setGoalTitle('');
      setShowGoalForm(false);
    } catch { setError('Unable to create goal.'); }
    finally { setAddingGoal(false); }
  };

  const doCompleteSession = async (id: number) => {
    try {
      const item = await completeStudySession(id);
      setSessions((x) => x.map((i) => (i.id === id ? item : i)));
    } catch { setError('Unable to complete session.'); }
  };

  const doCompleteGoal = async (id: number) => {
    try {
      const item = await completeStudyGoal(id);
      setGoals((x) => x.map((i) => (i.id === id ? item : i)));
    } catch { setError('Unable to complete goal.'); }
  };

  const doDelete = (kind: 'session' | 'goal', id: number) => {
    const remove = async () => {
      try {
        if (kind === 'session') {
          await deleteStudySession(id);
          setSessions((x) => x.filter((i) => i.id !== id));
        } else {
          await deleteStudyGoal(id);
          setGoals((x) => x.filter((i) => i.id !== id));
        }
      } catch (err) {
        if (isAuthError(err)) {
          signOut();
        } else {
          setError('Unable to delete item.');
        }
      }
    };

    if (Platform.OS === 'web') {
      void remove();
      return;
    }

    Alert.alert(
      kind === 'session' ? 'Delete session?' : 'Delete goal?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { void remove(); },
        },
      ]
    );
  };

  const subjectName = (id?: number) =>
    subjects.find((s) => s.id === id)?.name ?? 'General';

  // ─── AI Plan handlers ───────────────────────────────────────────────────────
  const toggleAISubject = (id: number) => {
    setAiSubjectIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleGeneratePlan = async () => {
    if (generating) return; // duplicate guard
    const days = parseInt(aiDays, 10);
    const minutes = parseInt(aiMinutesPerDay, 10);

    if (!Number.isFinite(days) || days < 1 || days > 30) {
      setError('Days must be between 1 and 30.');
      return;
    }
    if (!Number.isFinite(minutes) || minutes < 15 || minutes > 480) {
      setError('Minutes per day must be between 15 and 480.');
      return;
    }

    setGenerating(true);
    setPlan(null);
    setPlanError(null);
    setError(null);
    try {
      const result = await generateStudyPlan({
        subject_ids: aiSubjectIds.length > 0 ? aiSubjectIds : [],
        days,
        minutes_per_day: minutes,
        priorities: aiPriorities.trim() || undefined,
      });
      setPlan(result.plan);
      setSavedPlans((items) => [result, ...items.filter((item) => item.id !== result.id)]);
    } catch (err) {
      if (isAuthError(err)) { signOut(); return; }
      setPlanError(parseAIError(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Planner</Text>
          <Pressable
            style={styles.calBtn}
            onPress={() => router.push('/calendar')}
            accessibilityRole="button"
            accessibilityLabel="Open calendar"
          >
            <Text style={styles.calIcon}>◈</Text>
            <Text style={styles.calLabel}>Calendar</Text>
          </Pressable>
        </View>

        {/* Segmented control — now includes AI Plan */}
        <View style={styles.segWrap}>
          <SegmentedControl
            options={['Sessions', 'Goals', 'AI Plan']}
            selected={tab}
            onSelect={setTab}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {error && <Message tone="error">{error}</Message>}

          {/* ── Sessions tab ── */}
          {tab === 'Sessions' && (
            <>
              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
                onPress={() => setShowSessionForm((v) => !v)}
                accessibilityRole="button"
              >
                <Text style={styles.addBtnIcon}>{showSessionForm ? '−' : '+'}</Text>
                <Text style={styles.addBtnText}>New Study Session</Text>
              </Pressable>

              {showSessionForm && (
                <View style={styles.formCard}>
                  <Text style={styles.formLabel}>Subject</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {subjects.map((s) => (
                      <Chip key={s.id} label={s.name} active={subjectId === s.id} onPress={() => setSubjectId(s.id)} />
                    ))}
                  </ScrollView>
                  <Field label="Session title" placeholder="e.g. Review lecture notes" value={sessionTitle} onChangeText={setSessionTitle} returnKeyType="done" />
                  <Field label="Duration (minutes)" placeholder="60" keyboardType="numeric" value={sessionDuration} onChangeText={setSessionDuration} returnKeyType="done" />
                  <View style={styles.formActions}>
                    <Button label="Cancel" onPress={() => setShowSessionForm(false)} variant="ghost" size="sm" />
                    <Button label="Add Session" onPress={addSession} loading={addingSession} size="sm" />
                  </View>
                </View>
              )}

              {loading
                ? <><SkeletonCard /><SkeletonCard /></>
                : sessions.length === 0
                ? <EmptyState icon="◷" title="No sessions yet" text="Plan your first study session to stay on track." action="Add Session" onAction={() => setShowSessionForm(true)} />
                : sessions.map((item) => (
                  <View key={item.id} style={[styles.sessionCard, item.is_completed && styles.sessionCardDone]}>
                    <View style={[styles.sessionAccent, { backgroundColor: item.is_completed ? Colors.success : Colors.primary }]} />
                    <View style={styles.sessionBody}>
                      <View style={styles.sessionTop}>
                        <Text style={[styles.sessionTitle, item.is_completed && styles.doneText]} numberOfLines={1}>{item.title}</Text>
                        {item.is_completed
                          ? <Badge label="Done" color={Colors.success} />
                          : <Badge label="Upcoming" color={Colors.primary} />
                        }
                      </View>
                      <Text style={styles.sessionMeta}>{subjectName(item.subject_id)} · {item.duration_minutes} min</Text>
                      <Text style={styles.sessionDate}>{formatDate(item.scheduled_for)} {formatTime(item.scheduled_for)}</Text>
                      <View style={styles.sessionActions}>
                        {!item.is_completed && (
                          <Pressable onPress={() => doCompleteSession(item.id)} style={styles.actionBtn} accessibilityRole="button">
                            <Text style={styles.completeText}>Mark Complete</Text>
                          </Pressable>
                        )}
                        <Pressable onPress={() => doDelete('session', item.id)} style={styles.actionBtn} accessibilityRole="button">
                          <Text style={styles.deleteText}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))
              }
            </>
          )}

          {/* ── Goals tab ── */}
          {tab === 'Goals' && (
            <>
              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
                onPress={() => setShowGoalForm((v) => !v)}
                accessibilityRole="button"
              >
                <Text style={styles.addBtnIcon}>{showGoalForm ? '−' : '+'}</Text>
                <Text style={styles.addBtnText}>New Goal</Text>
              </Pressable>

              {showGoalForm && (
                <View style={styles.formCard}>
                  <Text style={styles.formLabel}>Subject</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {subjects.map((s) => (
                      <Chip key={s.id} label={s.name} active={subjectId === s.id} onPress={() => setSubjectId(s.id)} />
                    ))}
                  </ScrollView>
                  <Field label="Goal title" placeholder="e.g. Finish Chapter 5" value={goalTitle} onChangeText={setGoalTitle} returnKeyType="done" />
                  <View style={styles.formActions}>
                    <Button label="Cancel" onPress={() => setShowGoalForm(false)} variant="ghost" size="sm" />
                    <Button label="Add Goal" onPress={addGoal} loading={addingGoal} size="sm" />
                  </View>
                </View>
              )}

              {loading
                ? <><SkeletonCard /><SkeletonCard /></>
                : goals.length === 0
                ? <EmptyState icon="✦" title="No goals yet" text="Set your first study goal to track your progress." action="Add Goal" onAction={() => setShowGoalForm(true)} />
                : goals.map((item) => (
                  <View key={item.id} style={[styles.goalCard, item.is_completed && styles.goalCardDone]}>
                    <View style={styles.goalTop}>
                      <Text style={[styles.goalTitle, item.is_completed && styles.doneText]} numberOfLines={2}>{item.title}</Text>
                      {item.is_completed
                        ? <Badge label="Completed" color={Colors.success} />
                        : <Badge label="In Progress" color={Colors.warning} />
                      }
                    </View>
                    <Text style={styles.goalSubject}>{subjectName(item.subject_id)}</Text>
                    <ProgressBar progress={item.is_completed ? 100 : 40} color={item.is_completed ? Colors.success : Colors.primary} />
                    <View style={styles.sessionActions}>
                      {!item.is_completed && (
                        <Pressable onPress={() => doCompleteGoal(item.id)} style={styles.actionBtn} accessibilityRole="button">
                          <Text style={styles.completeText}>Complete</Text>
                        </Pressable>
                      )}
                      <Pressable onPress={() => doDelete('goal', item.id)} style={styles.actionBtn} accessibilityRole="button">
                        <Text style={styles.deleteText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              }
            </>
          )}

          {/* ── AI Plan tab ── */}
          {tab === 'AI Plan' && (
            <View style={styles.aiPlanTab}>
              {/* Intro */}
              <View style={styles.aiIntro}>
                <Text style={styles.aiIntroTitle}>✦ Generate a Study Plan</Text>
                <Text style={styles.aiIntroText}>
                  Configure your preferences below. The AI will generate a personalized plan based on your subjects, goals, and sessions.
                </Text>
              </View>

              {/* Subject multi-select */}
              <View style={styles.aiFormSection}>
                <Text style={styles.aiFormLabel}>Subjects (optional — empty means all)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {subjects.map((s) => (
                    <Chip
                      key={s.id}
                      label={s.name}
                      active={aiSubjectIds.includes(s.id)}
                      onPress={() => toggleAISubject(s.id)}
                    />
                  ))}
                </ScrollView>
                {subjects.length === 0 && (
                  <Text style={styles.aiHint}>No subjects found. Create subjects first.</Text>
                )}
              </View>

              {/* Duration config */}
              <View style={styles.aiFormRow}>
                <View style={styles.aiFormHalf}>
                  <Field
                    label="Days (1–30)"
                    value={aiDays}
                    onChangeText={setAiDays}
                    keyboardType="numeric"
                    placeholder="7"
                    returnKeyType="done"
                  />
                </View>
                <View style={styles.aiFormHalf}>
                  <Field
                    label="Min/day (15–480)"
                    value={aiMinutesPerDay}
                    onChangeText={setAiMinutesPerDay}
                    keyboardType="numeric"
                    placeholder="60"
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Priorities */}
              <Field
                label="Priorities or focus areas (optional)"
                value={aiPriorities}
                onChangeText={setAiPriorities}
                placeholder="e.g. Focus on calculus and essay writing. Exam on Friday."
                multiline
                style={styles.prioritiesInput}
              />

              {/* Generate button */}
              <Button
                label={generating ? 'Generating Plan…' : '✦  Generate Plan'}
                onPress={handleGeneratePlan}
                loading={generating}
                disabled={generating}
              />

              {/* Result */}
              <AIPlanCard
                plan={plan}
                loading={generating}
                error={planError}
                onDismiss={() => { setPlan(null); setPlanError(null); }}
                onRetry={handleGeneratePlan}
              />
              {savedPlans.length > 0 && (
                <View style={styles.savedPlans}>
                  <Text style={styles.savedPlansTitle}>Your saved plans</Text>
                  {savedPlans.map((saved) => (
                    <View key={saved.id} style={styles.savedPlanCard}>
                      <View style={styles.savedPlanHeader}>
                        <Text style={styles.savedPlanTitle}>{saved.title ?? 'AI Study Plan'}</Text>
                        <Pressable
                          onPress={() => {
                            if (saved.id) {
                              void deleteSavedStudyPlan(saved.id)
                                .then(() => {
                                  setSavedPlans((items) => items.filter((item) => item.id !== saved.id));
                                })
                                .catch((err) => {
                                  if (isAuthError(err)) {
                                    signOut();
                                  } else {
                                    setError('We could not delete this saved plan. Please try again.');
                                  }
                                });
                            }
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${saved.title ?? 'saved plan'}`}
                        >
                          <Text style={styles.deleteText}>Delete</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.savedPlanMeta}>
                        {saved.days ?? 0} days · {saved.minutes_per_day ?? 0} min/day
                      </Text>
                      <StudyPlanContent
                        plan={saved.plan}
                        compact={expandedPlanId !== saved.id}
                      />
                      <Pressable
                        onPress={() => setExpandedPlanId((current) => current === saved.id ? null : (saved.id ?? null))}
                        accessibilityRole="button"
                        accessibilityLabel={`${expandedPlanId === saved.id ? 'Hide' : 'View'} ${saved.title ?? 'saved plan'}`}
                        style={styles.viewPlanButton}
                      >
                        <Text style={styles.viewPlanText}>
                          {expandedPlanId === saved.id ? 'Show less' : 'View full plan'}
                        </Text>
                        <Text style={styles.viewPlanChevron}>{expandedPlanId === saved.id ? '↑' : '→'}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <BottomNav active="Planner" onNavigate={(r) => router.push(r as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  calBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  calIcon: { color: Colors.textMuted, fontSize: 16 },
  calLabel: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  segWrap: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },

  // Add button
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.primary + '40', borderStyle: 'dashed', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  addBtnIcon: { color: Colors.primaryLight, fontSize: Typography.size.xl, fontWeight: Typography.weight.black },
  addBtnText: { color: Colors.primaryLight, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },

  // Form
  formCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  formLabel: { color: Colors.textMuted, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  chipsRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },

  // Session card
  sessionCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  sessionCardDone: { opacity: 0.7 },
  sessionAccent: { width: 4 },
  sessionBody: { flex: 1, padding: Spacing.lg, gap: Spacing.xs },
  sessionTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  sessionTitle: { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold, flex: 1 },
  sessionMeta: { color: Colors.textMuted, fontSize: Typography.size.sm },
  sessionDate: { color: Colors.textSecondary, fontSize: Typography.size.sm },
  sessionActions: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xs },
  actionBtn: { paddingVertical: 4 },
  completeText: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  deleteText: { color: Colors.error, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  doneText: { textDecorationLine: 'line-through', color: Colors.textMuted },

  // Goal card
  goalCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm },
  goalCardDone: { opacity: 0.7 },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  goalTitle: { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold, flex: 1 },
  goalSubject: { color: Colors.textMuted, fontSize: Typography.size.sm },

  // AI Plan tab
  aiPlanTab: { gap: Spacing.md },
  savedPlans: { gap: Spacing.md, marginTop: Spacing.md },
  savedPlansTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  savedPlanCard: { gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  savedPlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  savedPlanTitle: { flex: 1, color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  savedPlanMeta: { color: Colors.primaryLight, fontSize: Typography.size.xs },
  savedPlanText: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 20 },
  viewPlanButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  viewPlanText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  viewPlanChevron: {
    color: Colors.primaryLight,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
  },
  aiIntro: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  aiIntroTitle: {
    color: Colors.primaryLight,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black,
  },
  aiIntroText: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },
  aiFormSection: { gap: Spacing.sm },
  aiFormLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
  aiHint: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontStyle: 'italic',
  },
  aiFormRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  aiFormHalf: { flex: 1 },
  prioritiesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
