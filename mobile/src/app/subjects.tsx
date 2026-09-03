import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createSubject, deleteSubject, getSubjects, Subject } from '@/services/api/subjectApi';

export default function SubjectsScreen() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    try {
      setSubjects(await getSubjects());
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) router.replace('/login');
      else setError('Unable to load subjects.');
    }
  }, [router]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const addSubject = async () => {
    if (!name.trim()) {
      setError('Enter a subject name.');
      return;
    }
    try {
      const subject = await createSubject({ name: name.trim() });
      setSubjects((current) => [subject, ...current]);
      setName('');
      setError(null);
    } catch {
      setError('Unable to create subject.');
    }
  };

  const removeSubject = async (id: number) => {
    try {
      await deleteSubject(id);
      setSubjects((current) => current.filter((subject) => subject.id !== id));
    } catch {
      setError('Unable to delete subject.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
        <Text style={styles.title}>My Subjects</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Data Structures"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />
          <Pressable style={styles.addButton} onPress={addSubject}><Text style={styles.buttonText}>Add</Text></Pressable>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        {subjects.map((subject) => (
          <View key={subject.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <Pressable onPress={() => removeSubject(subject.id)}><Text style={styles.delete}>Delete</Text></Pressable>
            </View>
            <Text style={styles.progress}>{subject.progress}% complete</Text>
            <View style={styles.track}><View style={[styles.fill, { width: `${subject.progress}%`, backgroundColor: subject.color }]} /></View>
          </View>
        ))}
        {!subjects.length && <Text style={styles.empty}>No subjects yet. Add your first subject above.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b0c1b' },
  container: { padding: 24, gap: 16 },
  back: { color: '#a5b4fc', fontWeight: '600' },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#15172e', borderColor: '#334155', borderWidth: 1, borderRadius: 8, padding: 12, color: '#fff' },
  addButton: { backgroundColor: '#6366f1', borderRadius: 8, justifyContent: 'center', paddingHorizontal: 18 },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#fca5a5' },
  card: { backgroundColor: '#15172e', borderRadius: 12, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  subjectName: { color: '#f8fafc', fontSize: 17, fontWeight: '700' },
  delete: { color: '#fca5a5', fontSize: 13 },
  progress: { color: '#94a3b8' },
  track: { height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 24 },
});
