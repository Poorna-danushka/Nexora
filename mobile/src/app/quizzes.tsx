import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getQuizzes, Quiz } from '@/services/api/quizApi';

export default function QuizzesScreen() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setQuizzes(await getQuizzes()); }
    catch (err) { if (axios.isAxiosError(err) && err.response?.status === 401) router.replace('/login'); else setError('Unable to load quizzes.'); }
  }, [router]);
  useEffect(() => { load(); }, [load]);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
    <Text style={styles.title}>Quizzes</Text>{error && <Text style={styles.error}>{error}</Text>}
    {quizzes.map((quiz) => <Pressable key={quiz.id} style={styles.card} onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: String(quiz.id) } })}>
      <Text style={styles.name}>{quiz.title}</Text><Text style={styles.meta}>{quiz.description || 'Practice quiz'} · Subject #{quiz.subject_id}</Text>
    </Pressable>)}{!quizzes.length && !error && <Text style={styles.empty}>No quizzes yet.</Text>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0b0c1b' }, container: { padding: 24, gap: 16 }, back: { color: '#a5b4fc' }, title: { color: '#f8fafc', fontSize: 28, fontWeight: '700' }, card: { backgroundColor: '#15172e', borderRadius: 12, padding: 16, gap: 8 }, name: { color: '#f8fafc', fontSize: 18, fontWeight: '700' }, meta: { color: '#94a3b8' }, error: { color: '#fca5a5' }, empty: { color: '#94a3b8' } });
