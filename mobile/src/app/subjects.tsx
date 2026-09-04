import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
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
  Surface,
  Field,
  Button
} from '@/components/ui';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { getSubjects, createSubject, deleteSubject, Subject } from '@/services/api/subjectApi';
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
    Alert.alert('Delete Subject', 'Are you sure you want to delete this subject?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
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
        }
      }
    ]);
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
          action={
            <IconButton accessibilityLabel="Add Subject" onPress={() => setShowCreate(!showCreate)}>
              <Text style={{ color: Colors.primaryLight, fontSize: 24 }}>+</Text>
            </IconButton>
          }
        />
        
        <View style={styles.searchContainer}>
          <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search subjects..." />
        </View>

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
              <Card key={sub.id} onPress={() => router.push(`/subjects/${sub.id}` as any)} noPadding style={styles.cardContainer}>
                <View style={[styles.cardAccent, { backgroundColor: sub.color || Colors.primary }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{sub.name}</Text>
                    <IconButton accessibilityLabel="Delete" onPress={() => handleDelete(sub.id)}>
                      <Text style={{ color: Colors.error }}>✕</Text>
                    </IconButton>
                  </View>
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
              </Card>
            ))}
          </View>
        )}

        {showCreate && (
          <Surface style={styles.createForm}>
            <Text style={styles.formTitle}>Add New Subject</Text>
            <Field label="Name" value={newName} onChangeText={setNewName} placeholder="e.g. Mathematics" />
            <Field label="Description (optional)" value={newDesc} onChangeText={setNewDesc} placeholder="Brief description" multiline />
            <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Text style={{ color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold }}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
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
            <View style={{ marginTop: Spacing.md }}>
              <Button label="Create Subject" onPress={handleCreate} loading={creating} disabled={!newName.trim()} />
            </View>
          </Surface>
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
  cardAccent: {
    width: 6,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  createForm: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  formTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    marginBottom: Spacing.sm,
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
