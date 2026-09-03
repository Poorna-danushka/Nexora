import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSubjects, Subject } from '@/services/api/subjectApi';
import { createNote, deleteNote, getNotes, Note } from '@/services/api/noteApi';

export default function NotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [loadedSubjects, loadedNotes] = await Promise.all([getSubjects(), getNotes(subjectId ?? undefined)]);
      setSubjects(loadedSubjects);
      setNotes(loadedNotes);
      if (subjectId === null && loadedSubjects.length) setSubjectId(loadedSubjects[0].id);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) router.replace('/login');
      else setError('Unable to load notes.');
    }
  }, [router, subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const addNote = async () => {
    if (!subjectId || !title.trim() || !content.trim()) {
      setError('Choose a subject and enter a title and note.');
      return;
    }
    try {
      const note = await createNote({ subject_id: subjectId, title: title.trim(), content: content.trim() });
      setNotes((current) => [note, ...current]);
      setTitle('');
      setContent('');
      setError(null);
    } catch {
      setError('Unable to create note.');
    }
  };

  const removeNote = async (id: number) => {
    try {
      await deleteNote(id);
      setNotes((current) => current.filter((note) => note.id !== id));
    } catch {
      setError('Unable to delete note.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
        <Text style={styles.title}>My Notes</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.form}>
          <Text style={styles.label}>Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjects}>
            {subjects.map((subject) => (
              <Pressable key={subject.id} style={[styles.subjectChip, subjectId === subject.id && styles.selectedChip]} onPress={() => setSubjectId(subject.id)}>
                <Text style={styles.chipText}>{subject.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput style={styles.input} placeholder="Note title" placeholderTextColor="#64748b" value={title} onChangeText={setTitle} />
          <TextInput style={[styles.input, styles.content]} placeholder="Write your note..." placeholderTextColor="#64748b" multiline value={content} onChangeText={setContent} />
          <Pressable style={styles.button} onPress={addNote}><Text style={styles.buttonText}>Add Note</Text></Pressable>
        </View>
        {notes.map((note) => (
          <View key={note.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.noteTitle}>{note.title}</Text>
              <Pressable onPress={() => removeNote(note.id)}><Text style={styles.delete}>Delete</Text></Pressable>
            </View>
            <Text style={styles.noteContent}>{note.content}</Text>
          </View>
        ))}
        {!notes.length && <Text style={styles.empty}>No notes yet. Create your first note above.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b0c1b' },
  container: { padding: 24, gap: 16 },
  back: { color: '#a5b4fc', fontWeight: '600' },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '700' },
  error: { color: '#fca5a5' },
  form: { backgroundColor: '#15172e', padding: 18, borderRadius: 12, gap: 10 },
  label: { color: '#cbd5e1', fontWeight: '600' },
  subjects: { gap: 8 },
  subjectChip: { borderColor: '#475569', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  selectedChip: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { color: '#f8fafc', fontSize: 13 },
  input: { backgroundColor: '#0b0c1b', borderColor: '#334155', borderWidth: 1, borderRadius: 8, padding: 12, color: '#fff' },
  content: { minHeight: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#6366f1', padding: 13, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#15172e', borderRadius: 12, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  noteTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', flex: 1 },
  delete: { color: '#fca5a5', fontSize: 13 },
  noteContent: { color: '#cbd5e1', lineHeight: 21 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 24 },
});
