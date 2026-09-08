// ─── Note Editor / Viewer Screen ─────────────────────────────────────────────
// Handles both "create new note" and "view existing note" modes.
// AI Summarization is available in view mode only (existing notes with content).

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Screen,
  KeyboardScreen,
  Header,
  Field,
  Button,
  Chip,
  IconButton,
  LoadingState
} from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { getNotes, createNote, updateNote, Note, deleteNote } from '@/services/api/noteApi';
import { createSubject, getSubjects, Subject } from '@/services/api/subjectApi';
import { useAuth } from '@/context/AuthContext';
import { summarizeNote, parseAIError, isAuthError, type AIErrorKind } from '@/services/api/aiApi';
import { AISummaryCard } from '@/components/AISummaryCard';
import axios from 'axios';

export default function NoteEditorScreen() {
  const { id, subjectId } = useLocalSearchParams();
  const router = useRouter();
  const { signOut } = useAuth();
  const isNew = id === 'new';

  const [note, setNote] = useState<Note | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(!isNew);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(subjectId ? Number(subjectId) : null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // ─── AI Summarize state ───────────────────────────────────────────────────
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<AIErrorKind | null>(null);

  useEffect(() => {
    if (isNew) {
      loadSubjects();
    } else {
      loadNoteAndSubjects();
    }
  }, [id]);

  const loadSubjects = async () => {
    try {
      const subs = await getSubjects();
      setSubjects(subs);
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || creatingSubject) return;
    try {
      setCreatingSubject(true);
      const subject = await createSubject({ name: newSubjectName.trim() });
      setSubjects((items) => [...items, subject]);
      setSelectedSubjectId(subject.id);
      setNewSubjectName('');
    } catch (err) {
      handleApiError(err);
      Alert.alert('Unable to create subject', 'Please try again.');
    } finally {
      setCreatingSubject(false);
    }
  };

  const loadNoteAndSubjects = async () => {
    try {
      setLoading(true);
      const [notes, subs] = await Promise.all([
        getNotes(),
        getSubjects()
      ]);
      setSubjects(subs);
      const found = notes.find(n => n.id === Number(id));
      if (found) {
        setNote(found);
        setTitle(found.title);
        setContent(found.content);
        setSelectedSubjectId(found.subject_id);
      } else {
        Alert.alert('Error', 'Note not found');
        router.back();
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApiError = (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      signOut();
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !selectedSubjectId) {
      Alert.alert('Validation', 'Please fill all fields and select a subject.');
      return;
    }
    try {
      setSaving(true);
      const data = {
        title: title.trim(),
        content: content.trim(),
        subject_id: selectedSubjectId
      };
      if (isNew) {
        await createNote(data);
        router.back();
      } else {
        const updated = await updateNote(note?.id ?? Number(id), data);
        setNote(updated);
        setEditing(false);
      }
    } catch (err) {
      handleApiError(err);
      Alert.alert('Error', 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const removeNote = async () => {
    if (!note) return;
    try {
      await deleteNote(note.id);
      router.back();
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      void removeNote();
      return;
    }
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void removeNote(); } },
    ]);
  };

  // ─── AI Summarize handler ─────────────────────────────────────────────────
  const handleSummarize = async () => {
    if (!note || summarizing) return; // duplicate-request guard
    setSummarizing(true);
    setSummary(null);
    setSummaryError(null);
    try {
      const result = await summarizeNote(note.id);
      setSummary(result.summary);
    } catch (err) {
      if (isAuthError(err)) {
        signOut();
        return;
      }
      setSummaryError(parseAIError(err));
    } finally {
      setSummarizing(false);
    }
  };

  const handleSummaryRetry = () => {
    setSummaryError(null);
    handleSummarize();
  };

  const handleSummaryDismiss = () => {
    setSummary(null);
    setSummaryError(null);
  };

  if (loading) {
    return <Screen><LoadingState label="Loading note..." /></Screen>;
  }

  if (isNew && !selectedSubjectId) {
    return (
      <Screen>
        <Header title="Choose a subject" onBack={() => router.back()} />
        <View style={styles.subjectPicker}>
          <Text style={styles.subjectPickerTitle}>Where should we save this note?</Text>
          <Text style={styles.subjectPickerText}>
            Choose a subject first so your notes stay organized.
          </Text>
          {subjects.length > 0 ? (
            <View style={styles.subjectPickerList}>
              {subjects.map((sub) => (
                <Pressable
                  key={sub.id}
                  onPress={() => setSelectedSubjectId(sub.id)}
                  style={styles.subjectPickerOption}
                  accessibilityRole="button"
                  accessibilityLabel={`Create note in ${sub.name}`}
                >
                  <View style={[styles.subjectDot, { backgroundColor: sub.color }]} />
                  <Text style={styles.subjectPickerOptionText}>{sub.name}</Text>
                  <Text style={styles.subjectPickerArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.createSubjectCard}>
              <Text style={styles.createSubjectTitle}>No subjects yet</Text>
              <Text style={styles.createSubjectText}>Create one now, then we’ll open your note.</Text>
              <Field
                label="Subject name"
                value={newSubjectName}
                onChangeText={setNewSubjectName}
                placeholder="e.g. Computer Networks"
                returnKeyType="done"
                onSubmitEditing={() => { void handleCreateSubject(); }}
              />
              <Button
                label="Create subject"
                onPress={handleCreateSubject}
                loading={creatingSubject}
                disabled={!newSubjectName.trim() || creatingSubject}
              />
            </View>
          )}
        </View>
      </Screen>
    );
  }

  if (isNew || editing) {
    return (
      <KeyboardScreen>
        <Header
          title={isNew ? 'New Note' : 'Edit Note'}
          onBack={() => isNew ? router.back() : setEditing(false)}
          right={<Text style={styles.cancelText} onPress={() => isNew ? router.back() : setEditing(false)}>Cancel</Text>}
        />
        <View style={styles.formContainer}>
          <Text style={styles.label}>Select Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
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

          <Field
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Note title"
            style={{ marginTop: Spacing.md }}
          />

          <Field
            label="Content"
            value={content}
            onChangeText={setContent}
            placeholder="Write your note here..."
            multiline
            style={styles.contentInput}
          />

          <View style={styles.saveBtn}>
            <Button label="Save Note" onPress={handleSave} loading={saving} />
          </View>
        </View>
      </KeyboardScreen>
    );
  }

  return (
    <Screen>
      <Header
        title="View Note"
        onBack={() => router.back()}
        right={
          <View style={styles.headerActions}>
            <IconButton accessibilityLabel="Edit Note" onPress={() => setEditing(true)}>
              <Text style={{ color: Colors.primaryLight, fontSize: 18 }}>Edit</Text>
            </IconButton>
            <IconButton accessibilityLabel="Delete Note" onPress={handleDelete}>
              <Text style={{ color: Colors.error, fontSize: 20 }}>✕</Text>
            </IconButton>
          </View>
        }
      />
      {note && (
        <View style={styles.viewContainer}>
          <Text style={styles.viewTitle}>{note.title}</Text>
          <Text style={styles.viewDate}>Updated: {new Date(note.updated_at).toLocaleDateString()}</Text>
          <View style={styles.viewContentContainer}>
            <Text style={styles.viewContent}>{note.content}</Text>
          </View>

          {/* ─── AI Summarize section ─────────────────────────────────────── */}
          <Button
            label={summarizing ? 'Generating Summary…' : '✦  Summarize with AI'}
            onPress={handleSummarize}
            variant="secondary"
            loading={summarizing}
            disabled={summarizing}
          />

          <AISummaryCard
            summary={summary}
            loading={summarizing}
            error={summaryError}
            onDismiss={handleSummaryDismiss}
            onRetry={handleSummaryRetry}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subjectPicker: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  subjectPickerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.black,
  },
  subjectPickerText: {
    color: Colors.textMuted,
    fontSize: Typography.size.base,
    lineHeight: 22,
  },
  subjectPickerList: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  subjectPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  subjectDot: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  subjectPickerOptionText: {
    color: Colors.textPrimary,
    flex: 1,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
  },
  subjectPickerArrow: {
    color: Colors.primaryLight,
    fontSize: Typography.size['2xl'],
  },
  createSubjectCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.lg,
  },
  createSubjectTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
  createSubjectText: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cancelText: {
    color: Colors.primaryLight,
    fontSize: Typography.size.base,
  },
  formContainer: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
  },
  chipScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  contentInput: {
    height: 200,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: Spacing.lg,
  },
  viewContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.lg,
  },
  viewTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
  },
  viewDate: {
    color: Colors.textMuted,
    fontSize: Typography.size.sm,
    marginTop: -Spacing.sm,
  },
  viewContentContainer: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  viewContent: {
    color: Colors.textSecondary,
    fontSize: Typography.size.md,
    lineHeight: 24,
  },
});
