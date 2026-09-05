import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text, Alert, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Screen,
  ScreenHeader,
  BottomNav,
  SearchInput,
  Chip,
  Card,
  Badge,
  IconButton,
  EmptyState,
  LoadingState,
  SkeletonCard
} from '@/components/ui';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { getNotes, Note, deleteNote } from '@/services/api/noteApi';
import { getSubjects, Subject } from '@/services/api/subjectApi';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

export default function NotesScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notesData, subjectsData] = await Promise.all([
        getNotes(),
        getSubjects()
      ]);
      setNotes(notesData);
      setSubjects(subjectsData);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteNote(id);
          setNotes(prev => prev.filter(n => n.id !== id));
        } catch (err) {
          Alert.alert('Error', 'Failed to delete note');
        }
      }}
    ]);
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = selectedSubjectId ? note.subject_id === selectedSubjectId : true;
      return matchesSearch && matchesSubject;
    });
  }, [notes, searchQuery, selectedSubjectId]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Screen scroll={true}>
        <ScreenHeader
          title="Notes"
          action={
            <IconButton accessibilityLabel="Add Note" onPress={() => router.push('/notes/new' as any)}>
              <Text style={{ color: Colors.primaryLight, fontSize: 24 }}>+</Text>
            </IconButton>
          }
        />
        
        <View style={styles.filters}>
          <SearchInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search notes..." />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            <Chip
              label="All"
              active={selectedSubjectId === null}
              onPress={() => setSelectedSubjectId(null)}
            />
            {subjects.map(sub => (
              <Chip
                key={sub.id}
                label={sub.name}
                active={selectedSubjectId === sub.id}
                onPress={() => setSelectedSubjectId(sub.id)}
                color={sub.color}
              />
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={{ gap: Spacing.md }}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </View>
        ) : filteredNotes.length === 0 ? (
          <EmptyState title="No notes yet" text="Create your first note to get started" action="Create Note" onAction={() => router.push('/notes/new' as any)} />
        ) : (
          <View style={{ gap: Spacing.md }}>
            {filteredNotes.map(note => {
              const subject = subjects.find(s => s.id === note.subject_id);
              return (
                <Card key={note.id} style={styles.noteCard}>
                  <View style={styles.noteInner}>
                    <Pressable
                      onPress={() => router.push(`/notes/${note.id}` as any)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${note.title}`}
                      style={({ pressed }) => [styles.noteMain, pressed && styles.notePressed]}
                    >
                      <View style={styles.noteHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                          {subject && (
                            <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                              <Badge label={subject.name} color={subject.color || Colors.primary} />
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={styles.notePreview} numberOfLines={2}>{note.content}</Text>
                      <Text style={styles.noteDate}>{new Date(note.updated_at).toLocaleDateString()}</Text>
                    </Pressable>
                    <View style={styles.deleteButton}>
                      <IconButton accessibilityLabel="Delete" onPress={() => handleDelete(note.id)}>
                        <Text style={{ color: Colors.error }}>✕</Text>
                      </IconButton>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </Screen>
      <BottomNav active="Notes" onNavigate={(route) => router.push(route as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  chipScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  noteCard: {
    position: 'relative',
  },
  noteInner: {
    position: 'relative',
  },
  noteMain: {
    paddingRight: Spacing.xl,
  },
  notePressed: {
    opacity: 0.82,
  },
  deleteButton: {
    position: 'absolute',
    top: -Spacing.sm,
    right: -Spacing.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  noteTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
  notePreview: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  noteDate: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    marginTop: Spacing.sm,
  }
});
