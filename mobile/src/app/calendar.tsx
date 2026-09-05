import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CalendarEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
} from '@/services/api/calendarApi';
import { useAuth } from '@/context/AuthContext';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  Badge,
  BottomNav,
  Button,
  EmptyState,
  Field,
  Message,
  SkeletonCard,
} from '@/components/ui';

function groupEvents(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const groups: Record<string, CalendarEvent[]> = {};
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const weekEnd = new Date();
  weekEnd.setDate(today.getDate() + 7);

  events.forEach((e) => {
    const d = new Date(e.starts_at);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === tomorrow.toDateString()) label = 'Tomorrow';
    else if (d <= weekEnd) label = 'This Week';
    else label = 'Later';
    if (!groups[label]) groups[label] = [];
    groups[label].push(e);
  });
  return groups;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDateFull(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayLabel(date: Date) {
  return date.toLocaleDateString([], { weekday: 'short' });
}

const GROUP_ORDER = ['Today', 'Tomorrow', 'This Week', 'Later'];

export default function CalendarScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDay, setSelectedDay] = useState(dayKey(new Date()));
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents(await getCalendarEvents(true));
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        signOut();
      } else {
        setError('Unable to load your calendar.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const saveEvent = async () => {
    if (!title.trim()) { setFormError('Event title is required.'); return; }
    setAdding(true);
    setFormError(null);
    try {
      if (editingEvent) {
        const updated = await updateCalendarEvent(editingEvent.id, {
          title: title.trim(),
          description: description.trim() || undefined,
        });
        setEvents((items) => items.map((item) => item.id === updated.id ? updated : item));
      } else {
        const start = new Date(`${selectedDay}T00:00:00`);
        const nextHour = new Date(Date.now() + 3600000);
        start.setHours(nextHour.getHours(), nextHour.getMinutes(), 0, 0);
        const end = new Date(start.getTime() + 1800000); // 30 min duration
        const event = await createCalendarEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          all_day: false,
          reminder_minutes: 15,
        });
        setEvents((x) => [...x, event].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      }
      setTitle('');
      setDescription('');
      setSelectedDay(dayKey(new Date()));
      setEditingEvent(null);
      setShowForm(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        signOut();
      } else {
        setFormError(editingEvent ? 'Unable to update event. Please try again.' : 'Unable to create event. Please try again.');
      }
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setSelectedDay(dayKey(new Date(event.starts_at)));
    setFormError(null);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setSelectedDay(dayKey(new Date()));
    setFormError(null);
  };

  const remove = (id: number, title: string) => {
    const deleteEvent = async () => {
      try {
        await deleteCalendarEvent(id);
        setEvents((x) => x.filter((e) => e.id !== id));
      } catch {
        setError('Unable to delete event.');
      }
    };

    if (Platform.OS === 'web') {
      void deleteEvent();
      return;
    }

    Alert.alert(
      'Delete event?',
      `"${title}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { void deleteEvent(); },
        },
      ]
    );
  };

  const grouped = groupEvents(events);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Calendar</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.addIconBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setShowForm((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Add event"
          >
            <Text style={styles.addIconText}>{showForm ? '−' : '+'}</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {error && <Message tone="error">{error}</Message>}

            {/* Create form */}
            {showForm && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>{editingEvent ? 'Edit Event' : 'New Event'}</Text>
                {formError && <Message tone="error">{formError}</Message>}
                <Field
                  label="Event title"
                  placeholder="e.g. Submit assignment"
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="next"
                />
                <Field
                  label="Description (optional)"
                  placeholder="Any additional details…"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  returnKeyType="done"
                />
                {!editingEvent && (
                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>Choose a day</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.dayOptions}
                    >
                      {Array.from({ length: 7 }, (_, index) => {
                        const date = new Date();
                        date.setHours(0, 0, 0, 0);
                        date.setDate(date.getDate() + index);
                        const key = dayKey(date);
                        const selected = selectedDay === key;
                        return (
                          <Pressable
                            key={key}
                            onPress={() => setSelectedDay(key)}
                            accessibilityRole="button"
                            accessibilityLabel={`Schedule for ${date.toLocaleDateString([], {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })}`}
                            style={[styles.dayOption, selected && styles.dayOptionSelected]}
                          >
                            <Text style={[styles.dayOptionLabel, selected && styles.dayOptionSelectedText]}>
                              {index === 0 ? 'Today' : dayLabel(date)}
                            </Text>
                            <Text style={[styles.dayOptionDate, selected && styles.dayOptionSelectedText]}>
                              {date.getDate()}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <Text style={styles.selectedDayText}>
                      Scheduled for {new Date(`${selectedDay}T00:00:00`).toLocaleDateString([], {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                )}
                <View style={styles.noteRow}>
                  <Text style={styles.noteText}>⏰  30-minute event · Reminder 15 min before</Text>
                </View>
                <View style={styles.formActions}>
                  <Button label="Cancel" onPress={cancelForm} variant="ghost" size="sm" />
                  <Button label={editingEvent ? 'Save Changes' : 'Add Event'} onPress={saveEvent} loading={adding} size="sm" />
                </View>
              </View>
            )}

            {/* Events */}
            {loading
              ? <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
              : events.length === 0
              ? <EmptyState icon="◈" title="Nothing scheduled" text="Add a reminder or event to stay ahead of your deadlines." action="Add Event" onAction={() => setShowForm(true)} />
              : GROUP_ORDER.filter((g) => grouped[g]).map((group) => (
                <View key={group}>
                  <Text style={styles.groupLabel}>{group}</Text>
                  {grouped[group].map((event) => (
                    <View key={event.id} style={styles.eventCard}>
                      <View style={[styles.eventTimeBlock, { backgroundColor: Colors.primarySubtle }]}>
                        <Text style={styles.eventTime}>{formatTime(event.starts_at)}</Text>
                        <Text style={styles.eventDate}>{formatDateFull(event.starts_at)}</Text>
                      </View>
                      <View style={styles.eventBody}>
                        <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                        {event.description && (
                          <Text style={styles.eventDesc} numberOfLines={1}>{event.description}</Text>
                        )}
                        <View style={styles.eventMeta}>
                          {event.reminder_minutes && (
                            <Text style={styles.eventReminder}>⏰ {event.reminder_minutes} min before</Text>
                          )}
                          <View style={styles.eventActions}>
                             <Pressable
                               onPress={() => startEdit(event)}
                               hitSlop={8}
                               accessibilityRole="button"
                               accessibilityLabel={`Edit ${event.title}`}
                             >
                               <Text style={styles.editText}>Edit</Text>
                             </Pressable>
                             <Pressable
                               onPress={() => remove(event.id, event.title)}
                               hitSlop={8}
                               accessibilityRole="button"
                               accessibilityLabel={`Delete ${event.title}`}
                             >
                               <Text style={styles.deleteText}>Delete</Text>
                             </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            }
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomNav active="Planner" onNavigate={(r) => router.push(r as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  backIcon: { color: Colors.primaryLight, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, lineHeight: 26 },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.black, letterSpacing: Typography.tracking.tight },
  addIconBtn: { width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  addIconText: { color: Colors.white, fontSize: Typography.size.xl, fontWeight: Typography.weight.black, lineHeight: 24 },

  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },

  formCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  formTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  noteRow: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md },
  noteText: { color: Colors.textMuted, fontSize: Typography.size.xs },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  dateSection: { gap: Spacing.sm },
  dateLabel: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  dayOptions: { gap: Spacing.sm, paddingVertical: 2 },
  dayOption: { width: 62, alignItems: 'center', gap: 2, paddingVertical: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  dayOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayOptionLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },
  dayOptionDate: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.black },
  dayOptionSelectedText: { color: '#FFFFFF' },
  selectedDayText: { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },

  groupLabel: { color: Colors.textMuted, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: Spacing.sm },

  eventCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.sm },
  eventTimeBlock: { width: 72, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: 2 },
  eventTime: { color: Colors.primaryLight, fontSize: Typography.size.sm, fontWeight: Typography.weight.black },
  eventDate: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
  eventBody: { flex: 1, padding: Spacing.md, gap: Spacing.xs },
  eventTitle: { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold },
  eventDesc: { color: Colors.textMuted, fontSize: Typography.size.sm },
  eventMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  eventActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  eventReminder: { color: Colors.textMuted, fontSize: Typography.size.xs },
  editText: { color: Colors.primaryLight, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
  deleteText: { color: Colors.error, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
});
