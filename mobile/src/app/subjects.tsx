import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Alert, Platform, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Screen,
  ScreenHeader,
  BottomNav,
  SearchInput,
  Card,
  Badge,
  ProgressBar,
  EmptyState,
  LoadingState,
  SkeletonCard,
  IconButton,
  Field,
  Button
} from '@/components/ui';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { getSubjects, createSubject, updateSubject, deleteSubject, Subject } from '@/services/api/subjectApi';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { Text } from 'react-native';

export default function SubjectsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
        color: newColor
      });
      setSubjects(prev => [...prev, newSub]);
      setNewName('');
      setNewDesc('');
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
        setSubjects(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          signOut();
        } else {
          Alert.alert('Error', 'Failed to delete subject');
        }
      }
    };

    // React Native's Alert confirmation does not work in the web build.
    if (Platform.OS === 'web') {
      void removeSubject();
      return;
    }

    Alert.alert('Delete Subject', 'Are you sure you want to delete this subject?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => { void removeSubject(); },
      },
    ]);
  };

  const startEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setEditName(subject.name);
    setEditDesc(subject.description || '');
    setEditColor(subject.color || Colors.subjectColors[0]);
    setError(null);
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
      setSubjects(prev => prev.map(subject => subject.id === updated.id ? updated : subject));
      cancelEdit();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      } else {
        setError('Failed to update subject');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    if (!searchQuery) return subjects;
    const lower = searchQuery.toLowerCase();
    return subjects.filter(s => s.name.toLowerCase().includes(lower));
  }, [subjects, searchQuery]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Screen scroll={true}>
        <ScreenHeader
          title="My Subjects"
        />
        
        <View style={styles.searchContainer}>
          <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search subjects..." />
        </View>

        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={() => setShowCreate((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel={showCreate ? 'Close add subject form' : 'Add subject'}
        >
          <Text style={styles.addBtnIcon}>{showCreate ? '−' : '+'}</Text>
          <Text style={styles.addBtnText}>{showCreate ? 'Close' : 'New Subject'}</Text>
        </Pressable>

        {showCreate && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Subject</Text>
            <Field label="Subject name" value={newName} onChangeText={setNewName} placeholder="e.g. Mathematics" returnKeyType="next" />
            <Field label="Description (optional)" value={newDesc} onChangeText={setNewDesc} placeholder="Brief description" multiline returnKeyType="done" />
            <View style={styles.colorSection}>
              <Text style={styles.formLabel}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
                {Colors.subjectColors.map(c => (
                  <View key={c} style={styles.colorDotWrapper}>
                    {newColor === c && <View style={[styles.colorDotRing, { borderColor: c }]} />}
                    <IconButton
                      accessibilityLabel={`Select color ${c}`}
                      onPress={() => setNewColor(c)}
                    >
                      <View style={[styles.colorDot, { backgroundColor: c }]} />
                    </IconButton>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={styles.formActions}>
              <Button label="Cancel" onPress={() => setShowCreate(false)} variant="ghost" size="sm" />
              <Button label="Add Subject" onPress={handleCreate} loading={creating} disabled={!newName.trim()} size="sm" />
            </View>
          </View>
        )}

        {editingSubject && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Edit Subject</Text>
            <Field label="Subject name" value={editName} onChangeText={setEditName} placeholder="e.g. Mathematics" returnKeyType="next" />
            <Field label="Description (optional)" value={editDesc} onChangeText={setEditDesc} placeholder="Brief description" multiline returnKeyType="done" />
            <View style={styles.colorSection}>
              <Text style={styles.formLabel}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
                {Colors.subjectColors.map(color => (
                  <View key={color} style={styles.colorDotWrapper}>
                    {editColor === color && <View style={[styles.colorDotRing, { borderColor: color }]} />}
                    <IconButton accessibilityLabel={`Select color ${color}`} onPress={() => setEditColor(color)}>
                      <View style={[styles.colorDot, { backgroundColor: color }]} />
                    </IconButton>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={styles.formActions}>
              <Button label="Cancel" onPress={cancelEdit} variant="ghost" size="sm" />
              <Button label="Save Changes" onPress={handleEdit} loading={savingEdit} disabled={!editName.trim() || savingEdit} size="sm" />
            </View>
          </View>
        )}

        {loading ? (
          <View style={{ gap: Spacing.md }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : error ? (
          <EmptyState title="Error" text={error} action="Retry" onAction={loadSubjects} icon="!" />
        ) : subjects.length === 0 ? (
          <EmptyState title="No subjects yet" text="Create your first subject to get started" action="Create Subject" onAction={() => setShowCreate(true)} />
        ) : (
          <View style={{ gap: Spacing.md }}>
            {filteredSubjects.map(sub => (
              <Card key={sub.id} noPadding style={styles.cardContainer}>
                <View style={styles.cardInner}>
                  <Pressable
                    onPress={() => router.push(`/subjects/${sub.id}` as any)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${sub.name}`}
                    style={({ pressed }) => [styles.cardMain, pressed && styles.cardPressed]}
                  >
                    <View style={[styles.cardAccent, { backgroundColor: sub.color || Colors.primary }]} />
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{sub.name}</Text>
                      {sub.description ? (
                        <Text style={styles.cardDesc} numberOfLines={2}>{sub.description}</Text>
                      ) : null}
                      <View style={styles.cardFooter}>
                        <View style={{ flex: 1, marginRight: Spacing.md }}>
                          <ProgressBar progress={sub.progress || 0} color={sub.color || Colors.primary} />
                        </View>
                        {sub.is_completed && <Badge label="Completed" color={Colors.success} />}
                      </View>
                    </View>
                  </Pressable>
                  <View style={styles.cardActions}>
                    <IconButton accessibilityLabel={`Edit ${sub.name}`} onPress={() => startEdit(sub)}>
                      <Text style={{ color: Colors.primaryLight }}>Edit</Text>
                    </IconButton>
                    <IconButton accessibilityLabel="Delete" onPress={() => handleDelete(sub.id)}>
                      <Text style={{ color: Colors.error }}>✕</Text>
                    </IconButton>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

      </Screen>
      <BottomNav active="Subjects" onNavigate={(route) => router.push(route as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: Spacing.md,
  },
  cardContainer: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
  },
  cardMain: {
    flexDirection: 'row',
  },
  cardPressed: {
    opacity: 0.82,
  },
  cardActions: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardAccent: {
    width: 6,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.lg,
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
    marginTop: Spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    borderStyle: 'dashed',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  addBtnPressed: {
    opacity: 0.8,
  },
  addBtnIcon: {
    color: Colors.primaryLight,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.black,
  },
  addBtnText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  formTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
  formLabel: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  colorSection: {
    gap: Spacing.sm,
  },
  colorRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  colorDotWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  }
});
