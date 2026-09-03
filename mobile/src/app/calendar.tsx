import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarEvent, createCalendarEvent, deleteCalendarEvent, getCalendarEvents } from '@/services/api/calendarApi';

export default function CalendarScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents(await getCalendarEvents(true));
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) router.replace('/login');
      else setError('Unable to load your calendar.');
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const addEvent = async () => {
    if (!title.trim()) {
      setError('Enter an event title.');
      return;
    }
    const starts = new Date(Date.now() + 60 * 60 * 1000);
    const ends = new Date(starts.getTime() + 30 * 60 * 1000);
    try {
      const event = await createCalendarEvent({
        title: title.trim(),
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        all_day: false,
        reminder_minutes: 15,
      });
      setEvents((current) => [...current, event].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      setTitle('');
      setError(null);
    } catch {
      setError('Unable to create calendar event.');
    }
  };

  const removeEvent = async (id: number) => {
    try {
      await deleteCalendarEvent(id);
      setEvents((current) => current.filter((event) => event.id !== id));
    } catch {
      setError('Unable to delete calendar event.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
        <Text style={styles.title}>Calendar & Reminders</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Event title"
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
          />
          <Pressable style={styles.button} onPress={addEvent}>
            <Text style={styles.buttonText}>Add Event (in 1 hour)</Text>
          </Pressable>
        </View>
        {events.length === 0 && <Text style={styles.empty}>No upcoming events.</Text>}
        {events.map((event) => (
          <View key={event.id} style={styles.card}>
            <Text style={styles.itemTitle}>{event.title}</Text>
            <Text style={styles.meta}>{new Date(event.starts_at).toLocaleString()}</Text>
            {event.reminder_minutes !== undefined && (
              <Text style={styles.meta}>Reminder: {event.reminder_minutes} minutes before</Text>
            )}
            <Pressable onPress={() => removeEvent(event.id)}>
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
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
  form: { backgroundColor: '#15172e', padding: 18, borderRadius: 12, gap: 10 },
  input: { backgroundColor: '#0b0c1b', borderColor: '#334155', borderWidth: 1, borderRadius: 8, padding: 12, color: '#fff' },
  button: { backgroundColor: '#6366f1', padding: 13, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  empty: { color: '#94a3b8' },
  card: { backgroundColor: '#15172e', borderRadius: 12, padding: 16, gap: 8 },
  itemTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  meta: { color: '#94a3b8' },
  delete: { color: '#fca5a5', fontWeight: '600' },
});
