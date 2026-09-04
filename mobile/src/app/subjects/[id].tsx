import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Screen,
  BottomNav,
  SegmentedControl,
  ProgressBar,
  Badge,
  Card,
  Button,
  IconButton,
  EmptyState,
  LoadingState,
  SkeletonCard
} from '@/components/ui';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { getSubjects, Subject } from '@/services/api/subjectApi';
import { getNotes, Note, deleteNote } from '@/services/api/noteApi';
import { getStudyMaterials, StudyMaterial, deleteStudyMaterial } from '@/services/api/studyMaterialApi';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const subjectId = Number(id);
  const router = useRouter();
  const { signOut } = useAuth();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  useEffect(() => {
    loadSubject();
  }, [subjectId]);

  useEffect(() => {
    if (tab === 'Notes') loadNotes();
    if (tab === 'Materials') loadMaterials();
  }, [tab]);

  const loadSubject = async () => {
    try {
      setLoading(true);
      const subs = await getSubjects();
      const found = subs.find(s => s.id === subjectId);
      if (found) setSubject(found);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      setLoadingNotes(true);
      const data = await getNotes(subjectId);
      setNotes(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      }
    } finally {
      setLoadingNotes(false);
    }
  };

  const loadMaterials = async () => {
    try {
      setLoadingMaterials(true);
      const data = await getStudyMaterials(subjectId);
      setMaterials(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      }
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleDeleteNote = (noteId: number) => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteNote(noteId);
          setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (err) {
          Alert.alert('Error', 'Failed to delete note');
        }
      }}
    ]);
  };

  if (loading) {
    return <Screen><LoadingState label="Loading subject..." /></Screen>;
  }

  if (!subject) {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <IconButton accessibilityLabel="Back" onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </IconButton>
        </View>
        <EmptyState title="Not Found" text="Subject not found." action="Go Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {subject.description ? (
        <Text style={styles.descText}>{subject.description}</Text>
      ) : (
        <Text style={styles.descTextMuted}>No description provided.</Text>
      )}
      <View style={{ marginTop: Spacing.lg }}>
        <Text style={styles.sectionTitle}>Progress</Text>
        <ProgressBar progress={subject.progress || 0} color={subject.color || Colors.primary} height={12} />
        <Text style={styles.progressText}>{subject.progress || 0}% Completed</Text>
      </View>
      <View style={{ marginTop: Spacing.lg }}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Text style={styles.detailText}>Created: {new Date(subject.created_at).toLocaleDateString()}</Text>
      </View>
    </View>
  );

  const renderNotes = () => (
    <View style={styles.tabContent}>
      <Button label="Add Note" onPress={() => router.push(`/notes/new?subjectId=${subject.id}` as any)} />
      <View style={{ marginTop: Spacing.md, gap: Spacing.md }}>
        {loadingNotes ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : notes.length === 0 ? (
          <EmptyState title="No notes" text="Create a note for this subject." />
        ) : (
          notes.map(note => (
            <Card key={note.id} onPress={() => router.push(`/notes/${note.id}` as any)}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                <IconButton accessibilityLabel="Delete Note" onPress={() => handleDeleteNote(note.id)}>
                  <Text style={{ color: Colors.error }}>✕</Text>
                </IconButton>
              </View>
              <Text style={styles.notePreview} numberOfLines={2}>{note.content}</Text>
              <Text style={styles.noteDate}>{new Date(note.updated_at).toLocaleDateString()}</Text>
            </Card>
          ))
        )}
      </View>
    </View>
  );

  const renderMaterials = () => (
    <View style={styles.tabContent}>
      <Button label="Upload Material" onPress={() => router.push('/materials')} />
      <View style={{ marginTop: Spacing.md, gap: Spacing.md }}>
        {loadingMaterials ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : materials.length === 0 ? (
          <EmptyState title="No materials" text="Upload study materials." />
        ) : (
          materials.map(mat => (
            <Card key={mat.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.matIconContainer}>
                  <Text style={styles.matIconText}>{mat.original_filename.split('.').pop()?.toUpperCase() || 'FILE'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={styles.matName} numberOfLines={1}>{mat.original_filename}</Text>
                  <Text style={styles.matSize}>{(mat.file_size / 1024).toFixed(1)} KB</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView>
        <View style={[styles.banner, { backgroundColor: subject.color ? subject.color + '33' : Colors.primary + '33' }]}>
          <View style={styles.headerRow}>
            <IconButton accessibilityLabel="Back" onPress={() => router.back()}>
              <Text style={styles.backIcon}>‹</Text>
            </IconButton>
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.subjectTitle}>{subject.name}</Text>
            {subject.is_completed && <Badge label="Completed" color={Colors.success} />}
          </View>
        </View>
        <View style={{ padding: Spacing.lg }}>
          <SegmentedControl
            options={['Overview', 'Notes', 'Materials']}
            selected={tab}
            onSelect={setTab}
          />
          {tab === 'Overview' && renderOverview()}
          {tab === 'Notes' && renderNotes()}
          {tab === 'Materials' && renderMaterials()}
        </View>
      </ScrollView>
      <BottomNav active="Subjects" onNavigate={(route) => router.push(route as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingTop: 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  backIcon: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  subjectTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.black,
    flex: 1,
  },
  tabContent: {
    marginTop: Spacing.lg,
  },
  descText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
    lineHeight: 22,
  },
  descTextMuted: {
    color: Colors.textMuted,
    fontSize: Typography.size.base,
    fontStyle: 'italic',
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    marginBottom: Spacing.sm,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  detailText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    flex: 1,
  },
  notePreview: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  noteDate: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    marginTop: Spacing.sm,
  },
  matIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matIconText: {
    color: Colors.primaryLight,
    fontWeight: Typography.weight.bold,
    fontSize: 12,
  },
  matName: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
  },
  matSize: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    marginTop: 2,
  }
});
