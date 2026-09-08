import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Screen,
  ScreenHeader,
  BottomNav,
  SearchInput,
  EmptyState,
  SkeletonCard,
  Field,
  Button,
  Badge,
} from '@/components/ui';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  Subject,
} from '@/services/api/subjectApi';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

// ─── Subject Card ─────────────────────────────────────────────────────────────
function SubjectCard({
  subject,
  onPress,
  onEdit,
  onDelete,
}: {
  subject: Subject;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = subject.color || Colors.primary;

  return (
    <View style={styles.card}>
      {/* Backdrop pressable for navigating to subject */}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${subject.name}`}
        style={({ pressed }) => [
          StyleSheet.absoluteFill,
          pressed && styles.cardPressed,
          { zIndex: 1 },
        ]}
      />

      {/* Top color strip */}
      <View style={[styles.cardStrip, { backgroundColor: color, zIndex: 2 }]} pointerEvents="none" />

      <View style={[styles.cardBody, { zIndex: 2 }]} pointerEvents="box-none">
        {/* Header row */}
        <View style={styles.cardHeader} pointerEvents="box-none">
          {/* Color dot + name */}
          <View style={styles.cardTitleRow} pointerEvents="none">
            <View style={[styles.colorDot, { backgroundColor: color }]} />
            <Text style={styles.cardTitle} numberOfLines={1}>
              {subject.name}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.cardActions} pointerEvents="auto">
            <Pressable
              onPress={onEdit}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${subject.name}`}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.actionBtnText}>✎</Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${subject.name}`}
              style={({ pressed }) => [
                styles.actionBtnDanger,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.actionBtnDangerText}>✕</Text>
            </Pressable>
          </View>
        </View>

        {/* Description */}
        {subject.description ? (
          <Text style={styles.cardDesc} numberOfLines={2} pointerEvents="none">
            {subject.description}
          </Text>
        ) : null}

        {/* Footer */}
        <View style={styles.cardFooter} pointerEvents="none">
          {subject.is_completed ? (
            <View style={[styles.completedBadge, { borderColor: Colors.success + '50', backgroundColor: Colors.success + '15' }]}>
              <Text style={styles.completedText}>✓ Completed</Text>
            </View>
          ) : (
            <View style={[styles.activeBadge, { borderColor: color + '50', backgroundColor: color + '15' }]}>
              <Text style={[styles.activeText, { color }]}>Active</Text>
            </View>
          )}
          <Text style={styles.tapHint}>Tap to explore →</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────
function StatsRow({ subjects }: { subjects: Subject[] }) {
  const total = subjects.length;
  const completed = subjects.filter((s) => s.is_completed).length;
  const avgProgress =
    total === 0
      ? 0
      : Math.round(subjects.reduce((sum, s) => sum + (s.progress || 0), 0) / total);
  const inProgress = subjects.filter(
    (s) => (s.progress || 0) > 0 && !s.is_completed
  ).length;

  const stats = [
    { value: total, label: 'Total', color: Colors.primaryLight },
    { value: inProgress, label: 'Active', color: Colors.warning },
    { value: completed, label: 'Done', color: Colors.success },
    { value: `${avgProgress}%`, label: 'Avg Progress', color: Colors.info },
  ];

  return (
    <View style={styles.statsRow}>
      {stats.map((stat, i) => (
        <View key={i} style={styles.statItem}>
          <Text style={[styles.statValue, { color: stat.color }]}>
            {stat.value}
          </Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Color Picker ─────────────────────────────────────────────────────────────
function ColorPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (c: string) => void;
}) {
  return (
    <View style={styles.colorPickerWrap}>
      <Text style={styles.formLabel}>Color</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colorRow}
      >
        {Colors.subjectColors.map((c) => (
          <Pressable
            key={c}
            onPress={() => onSelect(c)}
            accessibilityRole="button"
            accessibilityLabel={`Select color ${c}`}
            style={[
              styles.colorSwatch,
              { backgroundColor: c },
              selected === c && [styles.colorSwatchSelected, { borderColor: c }],
            ]}
          >
            {selected === c && (
              <Text style={styles.colorCheck}>✓</Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Form Sheet ───────────────────────────────────────────────────────────────
function FormSheet({
  title,
  name,
  setName,
  desc,
  setDesc,
  color,
  setColor,
  onCancel,
  onSubmit,
  submitLabel,
  loading,
  disabled,
}: {
  title: string;
  name: string;
  setName: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <View style={styles.formSheet}>
      <View style={styles.formSheetHandle} />
      <Text style={styles.formSheetTitle}>{title}</Text>

      <Field
        label="Subject name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Data Structures"
        returnKeyType="next"
      />
      <Field
        label="Description (optional)"
        value={desc}
        onChangeText={setDesc}
        placeholder="Brief description"
        multiline
        returnKeyType="done"
      />
      <ColorPicker selected={color} onSelect={setColor} />

      {/* Preview */}
      {name.trim() !== '' && (
        <View style={[styles.previewBar, { borderLeftColor: color }]}>
          <View style={[styles.previewDot, { backgroundColor: color }]} />
          <Text style={styles.previewText} numberOfLines={1}>
            {name}
          </Text>
        </View>
      )}

      <View style={styles.formActions}>
        <Button label="Cancel" onPress={onCancel} variant="ghost" size="sm" />
        <Button
          label={submitLabel}
          onPress={onSubmit}
          loading={loading}
          disabled={disabled}
          size="sm"
        />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SubjectsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState<string>(Colors.subjectColors[0]);
  const [creating, setCreating] = useState(false);

  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState<string>(Colors.subjectColors[0]);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSubjects();
      setSubjects(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      } else {
        setError('Failed to load subjects');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      setCreating(true);
      const newSub = await createSubject({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        color: newColor,
      });
      setSubjects((prev) => [...prev, newSub]);
      setNewName('');
      setNewDesc('');
      setNewColor(Colors.subjectColors[0]);
      setShowCreate(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      } else {
        Alert.alert('Error', 'Failed to create subject');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: number) => {
    const removeSubject = async () => {
      try {
        await deleteSubject(id);
        setSubjects((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          signOut();
        } else {
          Alert.alert('Error', 'Failed to delete subject');
        }
      }
    };

    if (Platform.OS === 'web') {
      void removeSubject();
      return;
    }

    Alert.alert(
      'Delete Subject',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void removeSubject() },
      ]
    );
  };

  const startEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setEditName(subject.name);
    setEditDesc(subject.description || '');
    setEditColor(subject.color || Colors.subjectColors[0]);
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingSubject(null);
    setEditName('');
    setEditDesc('');
  };

  const handleEdit = async () => {
    if (!editingSubject || !editName.trim() || savingEdit) return;
    try {
      setSavingEdit(true);
      const updated = await updateSubject(editingSubject.id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        color: editColor,
      });
      setSubjects((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      cancelEdit();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      } else {
        Alert.alert('Error', 'Failed to update subject');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    let result = subjects;
    if (filter === 'active') result = result.filter((s) => !s.is_completed);
    if (filter === 'completed') result = result.filter((s) => s.is_completed);
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(lower));
    }
    return result;
  }, [subjects, searchQuery, filter]);

  const FILTERS: { key: 'all' | 'active' | 'completed'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Screen scroll={true}>
        {/* Header */}
        <View style={styles.headerWrap}>
          <View>
            <Text style={styles.headerTitle}>My Subjects</Text>
            <Text style={styles.headerSub}>
              {subjects.length === 0
                ? 'No subjects yet'
                : `${subjects.length} subject${subjects.length > 1 ? 's' : ''} tracked`}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.addFab,
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
            ]}
            onPress={() => {
              setShowCreate((v) => !v);
              setEditingSubject(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={showCreate ? 'Close form' : 'Add subject'}
          >
            <Text style={styles.addFabIcon}>{showCreate ? '−' : '+'}</Text>
          </Pressable>
        </View>

        {/* Stats */}
        {!loading && subjects.length > 0 && (
          <StatsRow subjects={subjects} />
        )}

        {/* Search */}
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search subjects..."
        />

        {/* Filter chips */}
        {!loading && subjects.length > 0 && (
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                style={[
                  styles.filterChip,
                  filter === f.key && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filter === f.key && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Create form */}
        {showCreate && (
          <FormSheet
            title="New Subject"
            name={newName}
            setName={setNewName}
            desc={newDesc}
            setDesc={setNewDesc}
            color={newColor}
            setColor={setNewColor}
            onCancel={() => setShowCreate(false)}
            onSubmit={handleCreate}
            submitLabel="Create Subject"
            loading={creating}
            disabled={!newName.trim()}
          />
        )}

        {/* Edit form */}
        {editingSubject && (
          <FormSheet
            title="Edit Subject"
            name={editName}
            setName={setEditName}
            desc={editDesc}
            setDesc={setEditDesc}
            color={editColor}
            setColor={setEditColor}
            onCancel={cancelEdit}
            onSubmit={handleEdit}
            submitLabel="Save Changes"
            loading={savingEdit}
            disabled={!editName.trim() || savingEdit}
          />
        )}

        {/* Content */}
        {loading ? (
          <View style={{ gap: Spacing.md }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : error ? (
          <EmptyState
            title="Could not load subjects"
            text={error}
            action="Retry"
            onAction={loadSubjects}
            icon="!"
          />
        ) : subjects.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIconText}>📚</Text>
            </View>
            <Text style={styles.emptyTitle}>No subjects yet</Text>
            <Text style={styles.emptyDesc}>
              Create your first subject to start tracking your learning progress.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.emptyBtn,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setShowCreate(true)}
            >
              <Text style={styles.emptyBtnText}>+ Create First Subject</Text>
            </Pressable>
          </View>
        ) : filteredSubjects.length === 0 ? (
          <EmptyState
            title="No matches"
            text="Try a different search or filter."
            icon="⌕"
          />
        ) : (
          <View style={{ gap: Spacing.md }}>
            {filteredSubjects.map((sub) => (
              <SubjectCard
                key={sub.id}
                subject={sub}
                onPress={() => router.push(`/subjects/${sub.id}` as any)}
                onEdit={() => startEdit(sub)}
                onDelete={() => handleDelete(sub.id)}
              />
            ))}
          </View>
        )}
      </Screen>

      <BottomNav
        active="Subjects"
        onNavigate={(route) => router.push(route as never)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.black,
    letterSpacing: -0.5,
  },
  headerSub: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    marginTop: 2,
  },
  addFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  addFabIcon: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: Typography.weight.black,
    lineHeight: 30,
    marginTop: -2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  statValue: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.black,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    marginTop: 2,
  },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
  filterChipTextActive: {
    color: Colors.primaryLight,
  },

  // Subject Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  cardStrip: {
    height: 4,
    width: '100%',
  },
  cardBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    flex: 1,
  },
  cardDesc: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: Colors.primaryLight,
    fontSize: 14,
  },
  actionBtnDanger: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.errorMuted,
    borderWidth: 1,
    borderColor: Colors.error + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDangerText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
  },

  // Progress
  progressSection: {
    gap: Spacing.xs,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStatus: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
  },
  progressPct: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.black,
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  completedText: {
    color: Colors.success,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  activeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  activeText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  tapHint: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
  },

  // Form sheet
  formSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.md,
  },
  formSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  formSheetTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
  formLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    marginBottom: Spacing.xs,
  },

  // Color picker
  colorPickerWrap: {
    gap: Spacing.xs,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    transform: [{ scale: 1.15 }],
  },
  colorCheck: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: Typography.weight.bold,
  },

  // Preview bar
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewText: {
    color: Colors.textPrimary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    flex: 1,
  },

  // Form actions
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    gap: Spacing.md,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyIconText: {
    fontSize: 36,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  emptyDesc: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
  },
  emptyBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  emptyBtnText: {
    color: Colors.white,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
  },
});
