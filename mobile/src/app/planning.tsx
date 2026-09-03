import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  completeStudyGoal, completeStudySession, createStudyGoal, createStudySession,
  deleteStudyGoal, deleteStudySession, getStudyGoals, getStudySessions, StudyGoal, StudySession,
} from '@/services/api/planningApi';
import { getSubjects, Subject } from '@/services/api/subjectApi';

export default function PlanningScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [title, setTitle] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [subjectId, setSubjectId] = useState<number>();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [loadedSessions, loadedGoals, loadedSubjects] = await Promise.all([
        getStudySessions(), getStudyGoals(), getSubjects(),
      ]);
      setSessions(loadedSessions);
      setGoals(loadedGoals);
      setSubjects(loadedSubjects);
      if (!subjectId && loadedSubjects.length) setSubjectId(loadedSubjects[0].id);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) router.replace('/login');
      else setError('Unable to load your study plan.');
    }
  }, [router, subjectId]);

  useEffect(() => { load(); }, [load]);

  const addSession = async () => {
    if (!title.trim() || !subjectId) return setError('Choose a subject and enter a session title.');
    try {
      const item = await createStudySession({
        title: title.trim(), subject_id: subjectId, scheduled_for: new Date().toISOString(),
        duration_minutes: 30, is_completed: false,
      });
      setSessions((current) => [item, ...current]);
      setTitle('');
      setError(null);
    } catch { setError('Unable to create study session.'); }
  };

  const addGoal = async () => {
    if (!goalTitle.trim()) return setError('Enter a goal title.');
    try {
      const item = await createStudyGoal({ title: goalTitle.trim(), subject_id: subjectId, is_completed: false });
      setGoals((current) => [item, ...current]);
      setGoalTitle('');
      setError(null);
    } catch { setError('Unable to create study goal.'); }
  };

  const completeSession = async (id: number) => {
    const updated = await completeStudySession(id);
    setSessions((current) => current.map((entry) => entry.id === id ? updated : entry));
  };

  const completeGoal = async (id: number) => {
    const updated = await completeStudyGoal(id);
    setGoals((current) => current.map((entry) => entry.id === id ? updated : entry));
  };

  const removeSession = async (id: number) => {
    await deleteStudySession(id);
    setSessions((current) => current.filter((entry) => entry.id !== id));
  };

  const removeGoal = async (id: number) => {
    await deleteStudyGoal(id);
    setGoals((current) => current.filter((entry) => entry.id !== id));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
        <Text style={styles.title}>Study Planning</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {subjects.map((subject) => (
            <Pressable key={subject.id} style={[styles.chip, subjectId === subject.id && styles.selected]} onPress={() => setSubjectId(subject.id)}>
              <Text style={styles.chipText}>{subject.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.form}>
          <Text style={styles.section}>New Study Session</Text>
          <TextInput style={styles.input} placeholder="Session title" placeholderTextColor="#64748b" value={title} onChangeText={setTitle} />
          <Pressable style={styles.button} onPress={addSession}><Text style={styles.buttonText}>Add Session (30 min)</Text></Pressable>
        </View>
        {sessions.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={[styles.itemTitle, item.is_completed && styles.done]}>{item.title}</Text>
            <Text style={styles.meta}>{item.duration_minutes} minutes</Text>
            <View style={styles.actions}>
              {!item.is_completed && <Pressable onPress={() => completeSession(item.id)}><Text style={styles.action}>Complete</Text></Pressable>}
              <Pressable onPress={() => removeSession(item.id)}><Text style={styles.delete}>Delete</Text></Pressable>
            </View>
          </View>
        ))}
        <View style={styles.form}>
          <Text style={styles.section}>New Study Goal</Text>
          <TextInput style={styles.input} placeholder="Goal title" placeholderTextColor="#64748b" value={goalTitle} onChangeText={setGoalTitle} />
          <Pressable style={styles.button} onPress={addGoal}><Text style={styles.buttonText}>Add Goal</Text></Pressable>
        </View>
        {goals.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={[styles.itemTitle, item.is_completed && styles.done]}>{item.title}</Text>
            <View style={styles.actions}>
              {!item.is_completed && <Pressable onPress={() => completeGoal(item.id)}><Text style={styles.action}>Complete</Text></Pressable>}
              <Pressable onPress={() => removeGoal(item.id)}><Text style={styles.delete}>Delete</Text></Pressable>
            </View>
          </View>
        ))}
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
  chips: { gap: 8 },
  chip: { borderColor: '#475569', borderWidth: 1, borderRadius: 16, padding: 9 },
  selected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { color: '#fff', fontSize: 13 },
  form: { backgroundColor: '#15172e', padding: 18, borderRadius: 12, gap: 10 },
  section: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  input: { backgroundColor: '#0b0c1b', borderColor: '#334155', borderWidth: 1, borderRadius: 8, padding: 12, color: '#fff' },
  button: { backgroundColor: '#6366f1', padding: 13, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#15172e', borderRadius: 12, padding: 16, gap: 8 },
  itemTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  done: { textDecorationLine: 'line-through', color: '#94a3b8' },
  meta: { color: '#94a3b8' },
  actions: { flexDirection: 'row', gap: 16 },
  action: { color: '#a5b4fc', fontWeight: '600' },
  delete: { color: '#fca5a5' },
});
