import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getQuiz, submitAttempt, Quiz } from '@/services/api/quizApi';

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null); const [answers, setAnswers] = useState<Record<number, number>>({}); const [result, setResult] = useState<string | null>(null);
  useEffect(() => { getQuiz(Number(id)).then(setQuiz).catch(() => setResult('Unable to load quiz.')); }, [id]);
  const submit = async () => { try { const attempt = await submitAttempt(Number(id), answers); setResult(`Score: ${attempt.score}/${attempt.total}`); } catch { setResult('Unable to submit attempt.'); } };
  return <ScrollView contentContainerStyle={styles.container}><Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable><Text style={styles.title}>{quiz?.title || 'Quiz'}</Text>
    {quiz?.questions?.map((q) => <View key={q.id} style={styles.question}><Text style={styles.prompt}>{q.prompt}</Text>{q.options.map((option, index) => <Pressable key={option} style={[styles.option, answers[q.id] === index && styles.selected]} onPress={() => setAnswers({ ...answers, [q.id]: index })}><Text style={styles.optionText}>{option}</Text></Pressable>)}</View>)}
    {quiz && <Pressable style={styles.submit} onPress={submit}><Text style={styles.submitText}>Submit quiz</Text></Pressable>}{result && <Text style={styles.result}>{result}</Text>}</ScrollView>;
}
const styles = StyleSheet.create({ container: { padding: 24, gap: 16, backgroundColor: '#0b0c1b', minHeight: '100%' }, back: { color: '#a5b4fc' }, title: { color: '#f8fafc', fontSize: 28, fontWeight: '700' }, question: { gap: 8 }, prompt: { color: '#f8fafc', fontSize: 17, fontWeight: '600' }, option: { padding: 12, borderRadius: 8, backgroundColor: '#15172e' }, selected: { backgroundColor: '#3730a3' }, optionText: { color: '#e2e8f0' }, submit: { backgroundColor: '#6366f1', padding: 14, borderRadius: 8, alignItems: 'center' }, submitText: { color: '#fff', fontWeight: '700' }, result: { color: '#86efac', fontSize: 18 } });
