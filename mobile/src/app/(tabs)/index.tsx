import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentUser, UserRegisterResponse } from '@/services/api/userApi';
import { getStudySessions, StudySession } from '@/services/api/planningApi';
import { getStudyGoals, StudyGoal } from '@/services/api/planningApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  Avatar,
  BottomNav,
  ProgressBar,
  SkeletonCard,
  SkeletonLine,
} from '@/components/ui';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [user, setUser] = useState<UserRegisterResponse | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [u, s, g] = await Promise.all([
        getCurrentUser(),
        getStudySessions(),
        getStudyGoals(),
      ]);
      setUser(u);
      setSessions(s);
      setGoals(g);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        signOut();
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const upcomingSessions = sessions.filter((s) => !s.is_completed);
  const completedSessions = sessions.filter((s) => s.is_completed);
  const activeGoals = goals.filter((g) => !g.is_completed);
  const nextSession = upcomingSessions[0] ?? null;
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  const QUICK_ACTIONS = [
    { label: 'New Note', icon: '✎', route: '/notes/new', color: Colors.primary },
    { label: 'Session', icon: '◷', route: '/planning', color: '#8B5CF6' },
    { label: 'Goal', icon: '✦', route: '/planning', color: '#14B8A6' },
    { label: 'Event', icon: '◈', route: '/calendar', color: '#F59E0B' },
  ] as const;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Subtle top glow */}
      <View style={styles.glow} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Header ── */}
          <View style={styles.topRow}>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              {loading
                ? <SkeletonLine width={140} height={32} />
                : <Text style={styles.name}>{firstName}</Text>
              }
            </View>
            <Pressable
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              {loading
                ? <View style={styles.avatarSkeleton} />
                : <Avatar name={user?.full_name ?? '?'} size={44} />
              }
            </Pressable>
          </View>

          {/* ── Today summary ── */}
          {!loading && (
            <View style={styles.todayCard}>
              <Text style={styles.todayLabel}>TODAY</Text>
              <View style={styles.todayStats}>
                <View style={styles.todayStat}>
                  <Text style={styles.todayStatNum}>{upcomingSessions.length}</Text>
                  <Text style={styles.todayStatLbl}>upcoming</Text>
                </View>
                <View style={styles.todayDivider} />
                <View style={styles.todayStat}>
                  <Text style={[styles.todayStatNum, { color: Colors.success }]}>{completedSessions.length}</Text>
                  <Text style={styles.todayStatLbl}>completed</Text>
                </View>
                <View style={styles.todayDivider} />
                <View style={styles.todayStat}>
                  <Text style={[styles.todayStatNum, { color: '#F59E0B' }]}>{activeGoals.length}</Text>
                  <Text style={styles.todayStatLbl}>active goals</Text>
                </View>
              </View>
            </View>
          )}
          {loading && <SkeletonCard />}

          {/* ── Next Session ── */}
          <View>
            <Text style={styles.sectionTitle}>Next Up</Text>
            {loading
              ? <SkeletonCard />
              : nextSession
              ? (
                <Pressable
                  style={({ pressed }) => [styles.nextCard, pressed && { opacity: 0.85 }]}
                  onPress={() => router.push('/planning')}
                  accessibilityRole="button"
                  accessibilityLabel={`Open session: ${nextSession.title}`}
                >
                  <View style={styles.nextLeft}>
                    <View style={styles.nextAccent} />
                    <View>
                      <Text style={styles.nextTitle}>{nextSession.title}</Text>
                      <Text style={styles.nextMeta}>
                        {formatDate(nextSession.scheduled_for)} · {nextSession.duration_minutes} min
                      </Text>
                    </View>
                  </View>
                  <View style={styles.nextBadge}>
                    <Text style={styles.nextBadgeText}>{formatTime(nextSession.scheduled_for)}</Text>
                  </View>
                </Pressable>
              )
              : (
                <View style={styles.nextEmpty}>
                  <Text style={styles.nextEmptyIcon}>◷</Text>
                  <Text style={styles.nextEmptyTitle}>Nothing planned</Text>
                  <Text style={styles.nextEmptyText}>Plan your next study session to stay on track.</Text>
                  <Pressable
                    style={styles.nextEmptyCta}
                    onPress={() => router.push('/planning')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.nextEmptyCtaText}>Plan Session</Text>
                  </Pressable>
                </View>
              )
            }
          </View>

          {/* ── Active Goals ── */}
          {(loading || activeGoals.length > 0) && (
            <View>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Active Goals</Text>
                <Pressable onPress={() => router.push('/planning')} accessibilityRole="button">
                  <Text style={styles.sectionAction}>See all</Text>
                </Pressable>
              </View>
              {loading
                ? <><SkeletonCard /><SkeletonCard /></>
                : activeGoals.slice(0, 3).map((goal) => (
                  <Pressable
                    key={goal.id}
                    style={({ pressed }) => [styles.goalCard, pressed && { opacity: 0.85 }]}
                    onPress={() => router.push('/planning')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
                    <View style={styles.goalBottom}>
                      <View style={{ flex: 1 }}>
                        <ProgressBar progress={goal.is_completed ? 100 : 40} color={Colors.primary} height={5} />
                      </View>
                      <Text style={styles.goalStatus}>In Progress</Text>
                    </View>
                  </Pressable>
                ))
              }
            </View>
          )}

          {/* ── Quick Actions ── */}
          <View>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((action) => (
                <Pressable
                  key={action.label}
                  style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
                  onPress={() => router.push(action.route as never)}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <View style={[styles.quickIconWrap, { backgroundColor: action.color + '20' }]}>
                    <Text style={[styles.quickIcon, { color: action.color }]}>{action.icon}</Text>
                  </View>
                  <Text style={styles.quickLabel}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── New user onboarding state ── */}
          {!loading && sessions.length === 0 && goals.length === 0 && (
            <View style={styles.onboardCard}>
              <Text style={styles.onboardTitle}>Build your workspace</Text>
              <Text style={styles.onboardText}>
                Start by creating your first subject to organize your learning.
              </Text>
              <View style={styles.onboardSteps}>
                {[
                  { label: 'Create your account', done: true },
                  { label: 'Create your first subject', done: false },
                  { label: 'Add a note or material', done: false },
                  { label: 'Plan your first session', done: false },
                ].map((step) => (
                  <View key={step.label} style={styles.onboardStep}>
                    <View style={[styles.onboardDot, step.done && styles.onboardDotDone]}>
                      {step.done && <Text style={styles.onboardCheck}>✓</Text>}
                    </View>
                    <Text style={[styles.onboardStepText, step.done && styles.onboardStepDone]}>
                      {step.label}
                    </Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={({ pressed }) => [styles.onboardCta, pressed && { opacity: 0.85 }]}
                onPress={() => router.push('/subjects')}
                accessibilityRole="button"
              >
                <Text style={styles.onboardCtaText}>Create Subject</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <BottomNav active="Home" onNavigate={(route) => router.push(route as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },
  glow: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.primary + '12',
  },
  scroll: { paddingBottom: 100, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.xl },

  // Header
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingBlock: { gap: 2 },
  greeting: { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  name: { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  avatarSkeleton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceElevated },

  // Today card
  todayCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  todayLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: Spacing.md },
  todayStats: { flexDirection: 'row', alignItems: 'center' },
  todayStat: { flex: 1, alignItems: 'center' },
  todayStatNum: { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black },
  todayStatLbl: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
  todayDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  // Section
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black, marginBottom: Spacing.sm },
  sectionAction: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  // Next session
  nextCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  nextAccent: { width: 4, height: 44, borderRadius: 2, backgroundColor: Colors.primary },
  nextTitle: { color: Colors.textPrimary, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  nextMeta: { color: Colors.textMuted, fontSize: Typography.size.sm, marginTop: 2 },
  nextBadge: { backgroundColor: Colors.primarySubtle, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  nextBadgeText: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  nextEmpty: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nextEmptyIcon: { color: Colors.textMuted, fontSize: 28, marginBottom: Spacing.xs },
  nextEmptyTitle: { color: Colors.textPrimary, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  nextEmptyText: { color: Colors.textMuted, fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20 },
  nextEmptyCta: { marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.primarySubtle, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary + '40' },
  nextEmptyCtaText: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  // Goals
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  goalTitle: { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  goalBottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  goalStatus: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },

  // Quick actions
  quickGrid: { flexDirection: 'row', gap: Spacing.sm },
  quickItem: { flex: 1, alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.base },
  quickIconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  quickIcon: { fontSize: 20 },
  quickLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },

  // Onboarding card
  onboardCard: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, gap: Spacing.base },
  onboardTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  onboardText: { color: Colors.textMuted, fontSize: Typography.size.sm, lineHeight: 20 },
  onboardSteps: { gap: Spacing.sm, marginVertical: Spacing.sm },
  onboardStep: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  onboardDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surfaceElevated, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  onboardDotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  onboardCheck: { color: Colors.white, fontSize: 11, fontWeight: Typography.weight.black },
  onboardStepText: { color: Colors.textMuted, fontSize: Typography.size.sm },
  onboardStepDone: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
  onboardCta: { height: 48, backgroundColor: Colors.primary, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  onboardCtaText: { color: Colors.white, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
});
